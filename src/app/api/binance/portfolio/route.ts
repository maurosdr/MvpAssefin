import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import ccxt from 'ccxt';
import { decryptJson } from '@/lib/crypto-cookie';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const encoded = cookieStore.get('binance_keys')?.value;

    if (!encoded) {
      return NextResponse.json({ error: 'Binance não conectada' }, { status: 401 });
    }

    const { apiKey, secret } = decryptJson<{ apiKey: string; secret: string }>(encoded);

    const exchange = new ccxt.binance({
      apiKey,
      secret,
      enableRateLimit: true,
    });

    const balance = await exchange.fetchBalance();
    const tickers = await exchange.fetchTickers();

    const positions = Object.entries(balance.total || {})
      .filter(([, amount]) => (amount as number) > 0)
      .map(([asset, total]) => {
        const free = ((balance.free as unknown as Record<string, number>)?.[asset]) || 0;
        const locked = ((balance.used as unknown as Record<string, number>)?.[asset]) || 0;
        const totalAmount = total as number;

        let usdValue = 0;
        if (asset === 'USDT' || asset === 'BUSD' || asset === 'USDC') {
          usdValue = totalAmount;
        } else {
          const ticker = tickers[`${asset}/USDT`];
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

    return NextResponse.json({ positions, totalValue });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
