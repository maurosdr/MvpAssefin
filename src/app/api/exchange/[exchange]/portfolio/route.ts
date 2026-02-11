import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import ccxt from 'ccxt';

const SUPPORTED_EXCHANGES = ['binance', 'coinbase'];

function getCookieName(exchange: string): string {
  return `exchange_keys_${exchange}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createExchange(name: string, apiKey: string, secret: string): any {
  const config = { apiKey, secret, enableRateLimit: true };

  switch (name) {
    case 'binance':
      return new ccxt.binance(config);
    case 'coinbase':
      return new ccxt.coinbase(config);
    default:
      throw new Error(`Unsupported exchange: ${name}`);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ exchange: string }> }
) {
  try {
    const { exchange: exchangeName } = await params;

    if (!SUPPORTED_EXCHANGES.includes(exchangeName)) {
      return NextResponse.json(
        { error: `Unsupported exchange: ${exchangeName}` },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const encoded = cookieStore.get(getCookieName(exchangeName))?.value;

    if (!encoded) {
      return NextResponse.json(
        { error: `Not connected to ${exchangeName}` },
        { status: 401 }
      );
    }

    const { apiKey, secret } = JSON.parse(Buffer.from(encoded, 'base64').toString());
    const exchange = createExchange(exchangeName, apiKey, secret);

    const balance = await exchange.fetchBalance();

    // Try to get tickers for USD conversion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tickers: Record<string, any> = {};
    try {
      tickers = await exchange.fetchTickers();
    } catch {
      // Some exchanges may not support fetchTickers, continue without
    }

    const stablecoins = ['USDT', 'BUSD', 'USDC', 'USD', 'DAI'];
    const quoteAsset = exchangeName === 'coinbase' ? 'USD' : 'USDT';

    const positions = Object.entries(balance.total || {})
      .filter(([, amount]) => (amount as number) > 0)
      .map(([asset, total]) => {
        const free = ((balance.free as unknown as Record<string, number>)?.[asset]) || 0;
        const locked = ((balance.used as unknown as Record<string, number>)?.[asset]) || 0;
        const totalAmount = total as number;

        let usdValue = 0;
        if (stablecoins.includes(asset)) {
          usdValue = totalAmount;
        } else {
          const ticker =
            tickers[`${asset}/${quoteAsset}`] ||
            tickers[`${asset}/USDT`] ||
            tickers[`${asset}/USD`];
          if (ticker?.last) {
            usdValue = totalAmount * ticker.last;
          }
        }

        return {
          asset,
          free,
          locked,
          total: totalAmount,
          usdValue,
        };
      })
      .filter((p) => p.usdValue > 0.01)
      .sort((a, b) => b.usdValue - a.usdValue);

    const totalValue = positions.reduce((sum, p) => sum + p.usdValue, 0);

    return NextResponse.json({ exchange: exchangeName, positions, totalValue });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
