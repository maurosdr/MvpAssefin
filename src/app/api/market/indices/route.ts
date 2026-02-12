import { NextRequest, NextResponse } from 'next/server';

interface IndexData {
  symbol: string;
  name: string;
  data: { timestamp: number; close: number; date: string }[];
  currentPrice: number;
  change: number;
  changePercent: number;
}

const INDICES: Record<string, string> = {
  '^GSPC': 'S&P 500',
  '^IXIC': 'Nasdaq',
  '^DJI': 'Dow Jones',
  '^FTSE': 'FTSE 100',
  '^GDAXI': 'DAX',
  '^N225': 'Nikkei 225',
  '^BVSP': 'Bovespa',
  '^HSI': 'Hang Seng',
};

const WINDOW_MAP: Record<string, { range: string; interval: string }> = {
  '1d': { range: '1d', interval: '5m' },
  '1w': { range: '5d', interval: '15m' },
  '1m': { range: '1mo', interval: '1d' },
  '3m': { range: '3mo', interval: '1d' },
  '6m': { range: '6mo', interval: '1d' },
  '1y': { range: '1y', interval: '1wk' },
};

// Cache with 5-minute TTL
const cache = new Map<string, { data: IndexData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchIndexData(symbol: string, window: string): Promise<IndexData | null> {
  const cacheKey = `${symbol}:${window}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const { range, interval } = WINDOW_MAP[window] || WINDOW_MAP['1m'];

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)' },
    });

    if (!res.ok) return null;
    const json = await res.json();

    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const meta = result.meta || {};

    const data = timestamps.map((ts: number, i: number) => ({
      timestamp: ts * 1000,
      close: closes[i] ?? null,
      date: new Date(ts * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(window === '1d' ? { hour: '2-digit', minute: '2-digit' } : {}),
      }),
    })).filter((d: { close: number | null }) => d.close !== null);

    const currentPrice = meta.regularMarketPrice || (data.length > 0 ? data[data.length - 1].close : 0);
    const previousClose = meta.chartPreviousClose || meta.previousClose || (data.length > 1 ? data[0].close : currentPrice);
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    const indexData: IndexData = {
      symbol,
      name: INDICES[symbol] || symbol,
      data,
      currentPrice,
      change,
      changePercent,
    };

    cache.set(cacheKey, { data: indexData, timestamp: Date.now() });
    return indexData;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || '^GSPC';
  const window = searchParams.get('window') || '1m';

  // If requesting 'all', return summary for all indices
  if (symbol === 'all') {
    const promises = Object.keys(INDICES).map((sym) => fetchIndexData(sym, '1d'));
    const results = await Promise.all(promises);
    const indices = results
      .filter((r): r is IndexData => r !== null)
      .map((r) => ({
        symbol: r.symbol,
        name: r.name,
        currentPrice: r.currentPrice,
        change: r.change,
        changePercent: r.changePercent,
      }));

    if (indices.length === 0) {
      return NextResponse.json(getFallbackIndices());
    }

    return NextResponse.json(indices);
  }

  // Single index with full chart data
  const data = await fetchIndexData(symbol, window);
  if (!data) {
    return NextResponse.json(getFallbackChartData(symbol, window));
  }
  return NextResponse.json(data);
}

function getFallbackIndices() {
  return Object.entries(INDICES).map(([symbol, name]) => ({
    symbol,
    name,
    currentPrice: symbol === '^GSPC' ? 5800 : symbol === '^IXIC' ? 18500 : symbol === '^BVSP' ? 128000 : 35000,
    change: (Math.random() - 0.4) * 100,
    changePercent: (Math.random() - 0.4) * 2,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getFallbackChartData(symbol: string, _window: string): IndexData {
  const basePrice = symbol === '^GSPC' ? 5800 : symbol === '^IXIC' ? 18500 : 35000;
  const data = [];
  let price = basePrice * 0.95;
  const now = Date.now();

  for (let i = 30; i >= 0; i--) {
    price *= 1 + (Math.random() - 0.48) * 0.02;
    data.push({
      timestamp: now - i * 24 * 60 * 60 * 1000,
      close: Math.round(price * 100) / 100,
      date: new Date(now - i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }

  return {
    symbol,
    name: INDICES[symbol] || symbol,
    data,
    currentPrice: data[data.length - 1].close,
    change: data[data.length - 1].close - data[0].close,
    changePercent: ((data[data.length - 1].close - data[0].close) / data[0].close) * 100,
  };
}
