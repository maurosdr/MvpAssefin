import { NextResponse } from 'next/server';

let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // Fetch VIX YTD data
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const period1 = Math.floor(yearStart.getTime() / 1000);
    const period2 = Math.floor(now.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?period1=${period1}&period2=${period2}&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)' },
    });

    if (!res.ok) throw new Error('Failed to fetch VIX data');
    const json = await res.json();

    const result = json?.chart?.result?.[0];
    if (!result) throw new Error('No VIX data');

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const meta = result.meta || {};

    const data = timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: closes[i] != null ? Math.round(closes[i] * 100) / 100 : null,
    })).filter((d: { value: number | null }) => d.value !== null);

    const current = meta.regularMarketPrice || (data.length > 0 ? data[data.length - 1].value : 20);
    const ytdStart = data.length > 0 ? data[0].value : current;
    const ytdChange = ytdStart > 0 ? ((current - ytdStart) / ytdStart) * 100 : 0;

    const response = {
      current: Math.round(current * 100) / 100,
      ytdChange: Math.round(ytdChange * 100) / 100,
      ytdStartValue: ytdStart,
      data,
    };

    cache = { data: response, timestamp: Date.now() };
    return NextResponse.json(response);
  } catch {
    // Fallback
    const fallback = getFallbackVIX();
    return NextResponse.json(fallback);
  }
}

function getFallbackVIX() {
  const data = [];
  let value = 18;
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000));

  for (let i = 0; i <= days; i++) {
    value += (Math.random() - 0.5) * 2;
    value = Math.max(10, Math.min(40, value));
    const date = new Date(yearStart.getTime() + i * 24 * 60 * 60 * 1000);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(value * 100) / 100,
    });
  }

  const current = data[data.length - 1]?.value || 20;
  const ytdStart = data[0]?.value || 18;
  return {
    current,
    ytdChange: Math.round(((current - ytdStart) / ytdStart) * 100 * 100) / 100,
    ytdStartValue: ytdStart,
    data,
  };
}
