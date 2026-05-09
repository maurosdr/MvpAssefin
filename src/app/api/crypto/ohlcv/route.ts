import { NextRequest, NextResponse } from 'next/server';
import ccxt from 'ccxt';
import { usdtSymbolToCoinbaseUsd } from '@/lib/exchange-restrictions';

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

type CacheEntry = { data: unknown; timestamp: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 1000;

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRowsSimple = (ohlcv: any[]) =>
    ohlcv.map(([timestamp, open, high, low, close, volume]: number[]) => ({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    }));

  try {
    const ohlcv = await exchange.fetchOHLCV(symbol, config.tf, undefined, config.limit);
    const data = mapRowsSimple(ohlcv);
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (exchangeName !== 'binance') {
      try {
        const ohlcv = await exchanges.binance.fetchOHLCV(symbol, config.tf, undefined, config.limit);
        const data = mapRowsSimple(ohlcv);
        return NextResponse.json(data);
      } catch {
        // segue
      }
    } else {
      const altSymbol = usdtSymbolToCoinbaseUsd(symbol);
      try {
        const ohlcv = await coinbase.fetchOHLCV(altSymbol, config.tf, undefined, config.limit);
        const data = mapRowsSimple(ohlcv);
        cache.set(cacheKey, { data, timestamp: Date.now() });
        const res = NextResponse.json(data);
        res.headers.set('X-OHLCV-Provider', 'coinbase');
        return res;
      } catch {
        // Coinbase falhou
      }
    }
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
