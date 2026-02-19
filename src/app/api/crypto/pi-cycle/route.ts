import { NextRequest, NextResponse } from 'next/server';
import ccxt from 'ccxt';

const binance = new ccxt.binance({ enableRateLimit: true });

// Cache with 5-minute TTL
let cache: { data: unknown; timestamp: number; key: string } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

function calculateSMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += closes[j];
      result.push(sum / period);
    }
  }
  return result;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTC/USDT';

  const cacheKey = symbol;
  if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // Fetch daily candles — need at least 700+ days for 350-day MA
    const ohlcv = await binance.fetchOHLCV(symbol, '1d', undefined, 1000);

    if (!ohlcv || ohlcv.length === 0) {
      return NextResponse.json({ error: 'No data available' }, { status: 404 });
    }

    const dates: string[] = [];
    const closes: number[] = [];

    for (const [timestamp, , , , close] of ohlcv) {
      dates.push(new Date(timestamp as number).toISOString().split('T')[0]);
      closes.push(close as number);
    }

    const ma111 = calculateSMA(closes, 111);
    const ma350 = calculateSMA(closes, 350);

    // Determine the ratio and zone for the latest point with both MAs available
    type Zone = 'top' | 'bottom' | 'neutral';

    const data: Array<{
      date: string;
      price: number;
      ma111: number | null;
      ma350x2: number | null;
      ratio: number | null;
      zone: Zone;
    }> = [];

    for (let i = 0; i < closes.length; i++) {
      const m111 = ma111[i];
      const m350 = ma350[i];
      const ma350x2 = m350 !== null ? m350 * 2 : null;

      let ratio: number | null = null;
      let zone: Zone = 'neutral';

      if (m111 !== null && ma350x2 !== null && ma350x2 > 0) {
        ratio = m111 / ma350x2;
        if (ratio >= 1.0) {
          zone = 'top';
        } else if (ratio <= 0.75) {
          zone = 'bottom';
        } else {
          zone = 'neutral';
        }
      }

      data.push({
        date: dates[i],
        price: closes[i],
        ma111: m111 !== null ? Math.round(m111 * 100) / 100 : null,
        ma350x2: ma350x2 !== null ? Math.round(ma350x2 * 100) / 100 : null,
        ratio: ratio !== null ? Math.round(ratio * 10000) / 10000 : null,
        zone,
      });
    }

    // Only return rows where both MAs are available
    const filtered = data.filter((d) => d.ma111 !== null && d.ma350x2 !== null);

    cache = { data: filtered, timestamp: Date.now(), key: cacheKey };
    return NextResponse.json(filtered);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
