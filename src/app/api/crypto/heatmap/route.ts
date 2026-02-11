import { NextRequest, NextResponse } from 'next/server';
import ccxt from 'ccxt';

const binance = new ccxt.binance({ enableRateLimit: true });
const exchanges: Record<string, typeof binance> = {
  binance,
};

// Cache to avoid excessive API calls (5 minute TTL)
let cache: { data: unknown; timestamp: number; key: string } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTC/USDT';
  const exchangeName = searchParams.get('exchange') || 'binance';

  const cacheKey = `${exchangeName}:${symbol}`;
  if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const exchange = exchanges[exchangeName] || exchanges.binance;

  try {
    // Fetch weekly candles - up to 1000 weeks (~19 years)
    const ohlcv = await exchange.fetchOHLCV(symbol, '1w', undefined, 1000);

    if (!ohlcv || ohlcv.length === 0) {
      return NextResponse.json({ error: 'No data available' }, { status: 404 });
    }

    const weeklyCloses = ohlcv.map(([timestamp, , , , close]) => ({
      timestamp: timestamp as number,
      close: close as number,
    }));

    // Calculate 200-week Simple Moving Average
    const period = 200;
    const data: Array<{
      date: string;
      week: number;
      price: number;
      ma200w: number;
      monthlyChange: number;
    }> = [];

    for (let i = 0; i < weeklyCloses.length; i++) {
      const price = weeklyCloses[i].close;

      if (i < period - 1) {
        // Not enough data for 200WMA yet, still include the data point with partial MA
        continue;
      }

      // Calculate 200-week SMA
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += weeklyCloses[j].close;
      }
      const ma = sum / period;

      // Monthly change of the 200WMA: compare to ~4 weeks ago
      const prevIdx = data.length >= 4 ? data.length - 4 : -1;
      const prevMa = prevIdx >= 0 ? data[prevIdx].ma200w : ma;
      const monthlyChange = prevMa > 0 ? ((ma - prevMa) / prevMa) * 100 : 0;

      const date = new Date(weeklyCloses[i].timestamp);
      data.push({
        date: date.toISOString().split('T')[0],
        week: data.length,
        price,
        ma200w: Math.round(ma * 100) / 100,
        monthlyChange: Math.round(monthlyChange * 100) / 100,
      });
    }

    cache = { data, timestamp: Date.now(), key: cacheKey };
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
