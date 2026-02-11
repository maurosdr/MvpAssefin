import { NextRequest, NextResponse } from 'next/server';
import ccxt from 'ccxt';

const binance = new ccxt.binance({ enableRateLimit: true });
const coinbase = new ccxt.coinbase({ enableRateLimit: true });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const exchanges: Record<string, any> = {
  binance,
  coinbase,
};

const TIMEFRAME_MAP: Record<string, { tf: string; limit: number }> = {
  '1d': { tf: '1h', limit: 24 },
  '1w': { tf: '4h', limit: 42 },
  '1m': { tf: '4h', limit: 180 },
  '3m': { tf: '1d', limit: 90 },
  '6m': { tf: '1d', limit: 180 },
  '1y': { tf: '1d', limit: 365 },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTC/USDT';
  const window = searchParams.get('window') || '1m';
  const exchangeName = searchParams.get('exchange') || 'binance';

  const config = TIMEFRAME_MAP[window] || TIMEFRAME_MAP['1m'];
  const exchange = exchanges[exchangeName] || exchanges.binance;

  try {
    const ohlcv = await exchange.fetchOHLCV(symbol, config.tf, undefined, config.limit);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = ohlcv.map(([timestamp, open, high, low, close, volume]: any[]) => ({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    }));

    return NextResponse.json(data);
  } catch (error: unknown) {
    // If the selected exchange fails, try Binance as fallback
    if (exchangeName !== 'binance') {
      try {
        const ohlcv = await exchanges.binance.fetchOHLCV(symbol, config.tf, undefined, config.limit);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = ohlcv.map(([timestamp, open, high, low, close, volume]: any[]) => ({
          timestamp,
          open,
          high,
          low,
          close,
          volume,
        }));
        return NextResponse.json(data);
      } catch {
        // fallback also failed
      }
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
