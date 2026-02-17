import { NextRequest, NextResponse } from 'next/server';
import ccxt from 'ccxt';

const binance = new ccxt.binance({ enableRateLimit: true });

// Cache with 10-minute TTL
let cache: { data: unknown; timestamp: number; key: string } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

function calculateSMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += values[j];
      }
      result.push(sum / period);
    }
  }
  return result;
}

function calculateRollingStdDev(values: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1 || values[i] === null) {
      result.push(null);
      continue;
    }
    const window: number[] = [];
    for (let j = i - period + 1; j <= i; j++) {
      if (values[j] !== null) window.push(values[j] as number);
    }
    if (window.length < period * 0.5) {
      result.push(null);
      continue;
    }
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((sum, v) => sum + (v - mean) ** 2, 0) / window.length;
    result.push(Math.sqrt(variance));
  }
  return result;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTC/USDT';

  const cacheKey = `mvrv:${symbol}`;
  if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // Fetch ~5 years of daily candles
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5);
    const now = Date.now();
    const allCandles: Array<{ timestamp: number; close: number }> = [];

    let since = startDate.getTime();
    while (since < now) {
      const ohlcv = await binance.fetchOHLCV(symbol, '1d', since, 1000);
      if (!ohlcv || ohlcv.length === 0) break;

      for (const candle of ohlcv) {
        allCandles.push({
          timestamp: candle[0] as number,
          close: candle[4] as number,
        });
      }

      const lastTs = ohlcv[ohlcv.length - 1][0] as number;
      if (lastTs <= since) break;
      since = lastTs + 24 * 60 * 60 * 1000;
    }

    if (allCandles.length < 200) {
      return NextResponse.json({ error: 'Not enough data' }, { status: 404 });
    }

    const closes = allCandles.map((c) => c.close);

    // STH-MVRV: price / SMA(155) as proxy
    const sma155 = calculateSMA(closes, 155);
    const sthMvrv: Array<{ date: string; value: number; price: number }> = [];

    // Sample monthly to reduce payload
    let lastMonth = -1;
    for (let i = 0; i < allCandles.length; i++) {
      if (sma155[i] === null || sma155[i] === 0) continue;
      const date = new Date(allCandles[i].timestamp);
      const month = date.getMonth() + date.getFullYear() * 12;
      if (month === lastMonth) continue;
      lastMonth = month;

      const ratio = closes[i] / (sma155[i] as number);
      sthMvrv.push({
        date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: Math.round(ratio * 1000) / 1000,
        price: closes[i],
      });
    }

    // MVRV Z-Score: MV=price, RV=SMA(365), Z=(MV-RV)/stddev(MV-RV, 365d)
    const sma365 = calculateSMA(closes, 365);
    const deviations: (number | null)[] = closes.map((price, i) =>
      sma365[i] !== null ? price - (sma365[i] as number) : null
    );
    const rollingStd = calculateRollingStdDev(deviations, 365);

    const mvrvZScore: Array<{
      date: string;
      marketValue: number;
      realisedValue: number;
      zScore: number;
    }> = [];

    let lastZMonth = -1;
    for (let i = 0; i < allCandles.length; i++) {
      if (sma365[i] === null || rollingStd[i] === null || rollingStd[i] === 0) continue;
      const date = new Date(allCandles[i].timestamp);
      const month = date.getMonth() + date.getFullYear() * 12;
      if (month === lastZMonth) continue;
      lastZMonth = month;

      const mv = closes[i];
      const rv = sma365[i] as number;
      const z = (mv - rv) / (rollingStd[i] as number);

      mvrvZScore.push({
        date: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        marketValue: Math.round(mv),
        realisedValue: Math.round(rv),
        zScore: Math.round(z * 100) / 100,
      });
    }

    const result = { sthMvrv, mvrvZScore };
    cache = { data: result, timestamp: Date.now(), key: cacheKey };
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
