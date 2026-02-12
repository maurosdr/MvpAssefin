import { NextResponse } from 'next/server';

interface CurrencyData {
  pair: string;
  name: string;
  price: number;
  change1d: number;
  change1w: number;
}

const CURRENCY_PAIRS: { yahoo: string; pair: string; name: string }[] = [
  { yahoo: 'DX-Y.NYB', pair: 'DXY', name: 'US Dollar Index' },
  { yahoo: 'EURUSD=X', pair: 'EUR/USD', name: 'Euro / Dollar' },
  { yahoo: 'GBPUSD=X', pair: 'GBP/USD', name: 'Pound / Dollar' },
  { yahoo: 'USDJPY=X', pair: 'USD/JPY', name: 'Dollar / Yen' },
  { yahoo: 'USDCHF=X', pair: 'USD/CHF', name: 'Dollar / Franc' },
  { yahoo: 'AUDUSD=X', pair: 'AUD/USD', name: 'Aussie / Dollar' },
  { yahoo: 'NZDUSD=X', pair: 'NZD/USD', name: 'Kiwi / Dollar' },
  { yahoo: 'USDCAD=X', pair: 'USD/CAD', name: 'Dollar / Loonie' },
  { yahoo: 'USDMXN=X', pair: 'USD/MXN', name: 'Dollar / Peso' },
  { yahoo: 'USDBRL=X', pair: 'USD/BRL', name: 'Dollar / Real' },
];

let cache: { data: CurrencyData[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchCurrencyData(yahoo: string, pair: string, name: string): Promise<CurrencyData | null> {
  try {
    // Fetch 2 weeks of data to calculate 1d and 1w changes
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?range=5d&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)' },
    });

    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const closes = result.indicators?.quote?.[0]?.close || [];
    const meta = result.meta || {};
    const validCloses = closes.filter((c: number | null) => c !== null && c !== undefined) as number[];

    const currentPrice = meta.regularMarketPrice || (validCloses.length > 0 ? validCloses[validCloses.length - 1] : 0);
    const previousClose = meta.chartPreviousClose || (validCloses.length > 1 ? validCloses[validCloses.length - 2] : currentPrice);
    const weekAgo = validCloses.length > 0 ? validCloses[0] : currentPrice;

    const change1d = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
    const change1w = weekAgo > 0 ? ((currentPrice - weekAgo) / weekAgo) * 100 : 0;

    return {
      pair,
      name,
      price: Math.round(currentPrice * 10000) / 10000,
      change1d: Math.round(change1d * 100) / 100,
      change1w: Math.round(change1w * 100) / 100,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const promises = CURRENCY_PAIRS.map((c) => fetchCurrencyData(c.yahoo, c.pair, c.name));
    const results = await Promise.all(promises);
    const currencies = results.filter((r): r is CurrencyData => r !== null);

    if (currencies.length > 0) {
      cache = { data: currencies, timestamp: Date.now() };
      return NextResponse.json(currencies);
    }

    return NextResponse.json(getFallbackCurrencies());
  } catch {
    return NextResponse.json(getFallbackCurrencies());
  }
}

function getFallbackCurrencies(): CurrencyData[] {
  return [
    { pair: 'DXY', name: 'US Dollar Index', price: 104.25, change1d: 0.12, change1w: -0.35 },
    { pair: 'EUR/USD', name: 'Euro / Dollar', price: 1.0845, change1d: -0.08, change1w: 0.22 },
    { pair: 'GBP/USD', name: 'Pound / Dollar', price: 1.2695, change1d: 0.15, change1w: 0.45 },
    { pair: 'USD/JPY', name: 'Dollar / Yen', price: 149.85, change1d: 0.22, change1w: -0.18 },
    { pair: 'USD/CHF', name: 'Dollar / Franc', price: 0.8812, change1d: -0.05, change1w: -0.32 },
    { pair: 'AUD/USD', name: 'Aussie / Dollar', price: 0.6542, change1d: 0.18, change1w: 0.55 },
    { pair: 'NZD/USD', name: 'Kiwi / Dollar', price: 0.6015, change1d: 0.10, change1w: 0.28 },
    { pair: 'USD/CAD', name: 'Dollar / Loonie', price: 1.3548, change1d: -0.12, change1w: 0.15 },
    { pair: 'USD/MXN', name: 'Dollar / Peso', price: 17.15, change1d: 0.25, change1w: -0.42 },
    { pair: 'USD/BRL', name: 'Dollar / Real', price: 4.97, change1d: -0.35, change1w: 0.68 },
  ];
}
