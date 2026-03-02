import { NextRequest, NextResponse } from 'next/server';
import ccxt from 'ccxt';

const binance = new ccxt.binance({ enableRateLimit: true, timeout: 10_000 });
const coinbase = new ccxt.coinbase({ enableRateLimit: true, timeout: 10_000 });
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

// Cache simples por combinação de símbolo/janela/exchange
type CacheEntry = { data: unknown; timestamp: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 1000; // 10 segundos

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTC/USDT';
  const window = searchParams.get('window') || '1m';
  const exchangeName = searchParams.get('exchange') || 'binance';

  const config = TIMEFRAME_MAP[window] || TIMEFRAME_MAP['1m'];
  const exchange = exchanges[exchangeName] || exchanges.binance;

  const cacheKey = `${exchangeName}:${symbol}:${window}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

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

    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json(data);
  } catch (error: unknown) {
    // If the selected exchange fails, try Binance as fallback (sem cache, pois já falhou)
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
