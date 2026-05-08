import { NextResponse } from 'next/server';

export interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: 'BRL' | 'USD';
  type: 'index' | 'stock' | 'crypto';
}

const B3_SYMBOLS = ['PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'ABEV3', 'WEGE3', 'BBAS3', 'RENT3', 'B3SA3', 'SUZB3'];

const INDICES = [
  { yahoo: '^BVSP', symbol: 'IBOV',    name: 'Ibovespa', currency: 'BRL' as const },
  { yahoo: '^GSPC', symbol: 'S&P 500', name: 'S&P 500',  currency: 'USD' as const },
  { yahoo: '^IXIC', symbol: 'NASDAQ',  name: 'Nasdaq',   currency: 'USD' as const },
];

let cache: { data: TickerItem[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 1000; // 30s

async function fetchYahooMeta(symbol: string): Promise<{ price: number; change: number; changePercent: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prev;
    const changePercent = prev > 0 ? (change / prev) * 100 : 0;
    return { price, change, changePercent };
  } catch {
    return null;
  }
}

async function fetchIndices(): Promise<TickerItem[]> {
  const results = await Promise.all(INDICES.map(idx => fetchYahooMeta(idx.yahoo)));
  const out: TickerItem[] = [];
  for (let i = 0; i < results.length; i += 1) {
    const meta = results[i];
    if (!meta) continue;
    out.push({
      symbol: INDICES[i].symbol,
      name: INDICES[i].name,
      price: meta.price,
      change: meta.change,
      changePercent: meta.changePercent,
      currency: INDICES[i].currency,
      type: 'index',
    });
  }
  return out;
}

async function fetchB3Stocks(): Promise<TickerItem[]> {
  const token = process.env.BRAPI_TOKEN;
  if (!token) return [];
  try {
    const symbols = B3_SYMBOLS.join(',');
    const res = await fetch(`https://brapi.dev/api/quote/${symbols}?token=${token}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results ?? [])
      .filter((q: { regularMarketPrice?: number }) => q.regularMarketPrice != null)
      .map((q: {
        symbol: string;
        shortName?: string;
        regularMarketPrice: number;
        regularMarketChange?: number;
        regularMarketChangePercent?: number;
      }) => ({
        symbol: q.symbol,
        name: q.shortName ?? q.symbol,
        price: q.regularMarketPrice,
        change: q.regularMarketChange ?? 0,
        changePercent: q.regularMarketChangePercent ?? 0,
        currency: 'BRL' as const,
        type: 'stock' as const,
      }));
  } catch {
    return [];
  }
}

async function fetchBTC(): Promise<TickerItem | null> {
  const meta = await fetchYahooMeta('BTC-USD');
  if (!meta) return null;
  return {
    symbol: 'BTC/USD',
    name: 'Bitcoin',
    price: meta.price,
    change: meta.change,
    changePercent: meta.changePercent,
    currency: 'USD',
    type: 'crypto',
  };
}

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const [indices, b3Stocks, btc] = await Promise.all([
    fetchIndices(),
    fetchB3Stocks(),
    fetchBTC(),
  ]);

  const items: TickerItem[] = [
    ...indices,
    ...b3Stocks,
    ...(btc ? [btc] : []),
  ];

  cache = { data: items, timestamp: Date.now() };
  return NextResponse.json(items);
}
