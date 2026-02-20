import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Stock 200 Week Moving Average Heatmap API
//
// Adapts the crypto 200WMA heatmap for B3 stocks.
// Uses BRAPI weekly data to calculate the 200-week SMA and monthly % change.
// ---------------------------------------------------------------------------

const BRAPI_TOKEN = 'kAohDLSrNNS3JNZijP4voJ';

// Cache: 30-minute TTL
let cache: { data: unknown; timestamp: number; key: string } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'PETR4';

  const cacheKey = `stock-heatmap:${symbol}`;
  if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // Fetch max range with weekly interval
    const url = `https://brapi.dev/api/quote/${symbol}?range=max&interval=1wk`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Authorization: `Bearer ${BRAPI_TOKEN}`,
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) throw new Error(`BRAPI returned ${res.status}`);

    const json = await res.json();
    const stock = json?.results?.[0];
    if (!stock) throw new Error('No stock data');

    const history: { date: number; close?: number }[] =
      stock.historicalDataPrice || [];

    const weeklyCloses = history
      .filter((h) => h.close && h.close > 0)
      .map((h) => ({
        timestamp: h.date * 1000,
        close: h.close!,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (weeklyCloses.length < 50) {
      return NextResponse.json({ error: 'Insufficient weekly data' }, { status: 404 });
    }

    // Calculate 200-week SMA (or use available period if < 200 weeks)
    const period = Math.min(200, weeklyCloses.length);
    const data: {
      date: string;
      week: number;
      price: number;
      ma200w: number;
      monthlyChange: number;
    }[] = [];

    for (let i = period - 1; i < weeklyCloses.length; i++) {
      const price = weeklyCloses[i].close;

      // Calculate SMA
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += weeklyCloses[j].close;
      }
      const ma = sum / period;

      // Monthly change of the MA (compare to ~4 weeks ago)
      const prevIdx = data.length >= 4 ? data.length - 4 : -1;
      const prevMa = prevIdx >= 0 ? data[prevIdx].ma200w : ma;
      const monthlyChange = prevMa > 0 ? ((ma - prevMa) / prevMa) * 100 : 0;

      const date = new Date(weeklyCloses[i].timestamp);
      data.push({
        date: date.toISOString().split('T')[0],
        week: data.length,
        price: Math.round(price * 100) / 100,
        ma200w: Math.round(ma * 100) / 100,
        monthlyChange: Math.round(monthlyChange * 100) / 100,
      });
    }

    cache = { data, timestamp: Date.now(), key: cacheKey };
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
