import { NextRequest, NextResponse } from 'next/server';

interface YieldPoint {
  maturity: string;
  label: string;
  yield: number;
}

const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY || '';

// Mapping from Massive.com (Polygon.io) treasury yields response fields to our internal format
const MASSIVE_FIELD_MAP: Record<string, { maturity: string; label: string }> = {
  '1month': { maturity: '1m', label: '1M' },
  '2month': { maturity: '2m', label: '2M' },
  '3month': { maturity: '3m', label: '3M' },
  '6month': { maturity: '6m', label: '6M' },
  '1year': { maturity: '1y', label: '1Y' },
  '2year': { maturity: '2y', label: '2Y' },
  '3year': { maturity: '3y', label: '3Y' },
  '5year': { maturity: '5y', label: '5Y' },
  '7year': { maturity: '7y', label: '7Y' },
  '10year': { maturity: '10y', label: '10Y' },
  '20year': { maturity: '20y', label: '20Y' },
  '30year': { maturity: '30y', label: '30Y' },
};

// Fallback: Yahoo Finance symbols for US Treasury yields
const YIELD_SYMBOLS: { yahoo: string; maturity: string; label: string }[] = [
  { yahoo: '^IRX', maturity: '3m', label: '3M' },
  { yahoo: '^FVX', maturity: '5y', label: '5Y' },
  { yahoo: '^TNX', maturity: '10y', label: '10Y' },
  { yahoo: '^TYX', maturity: '30y', label: '30Y' },
];

const ALL_MATURITIES = ['1m', '3m', '6m', '1y', '2y', '3y', '5y', '7y', '10y', '20y', '30y'];

let cache: { data: unknown; timestamp: number; key: string } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

// --- Massive.com (Polygon.io) API ---

async function fetchFromMassive(compareDate?: string): Promise<Map<string, number> | null> {
  if (!MASSIVE_API_KEY) return null;

  try {
    const params = new URLSearchParams({
      apiKey: MASSIVE_API_KEY,
      limit: '1',
      sort: 'date',
      order: 'desc',
    });

    if (compareDate) {
      params.set('date.lte', compareDate);
    }

    const url = `https://api.polygon.io/v1/economy/treasury-yields?${params.toString()}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)' },
    });

    if (!res.ok) return null;

    const json = await res.json();
    const results = json?.results;
    if (!Array.isArray(results) || results.length === 0) return null;

    const record = results[0];
    const knownPoints = new Map<string, number>();

    for (const [field, mapping] of Object.entries(MASSIVE_FIELD_MAP)) {
      if (record[field] != null && typeof record[field] === 'number') {
        knownPoints.set(mapping.maturity, record[field]);
      }
    }

    return knownPoints.size > 0 ? knownPoints : null;
  } catch {
    return null;
  }
}

// --- Yahoo Finance fallback ---

async function fetchYieldFromYahoo(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    return meta?.regularMarketPrice || null;
  } catch {
    return null;
  }
}

async function fetchYahooYields(): Promise<Map<string, number>> {
  const knownPoints = new Map<string, number>();
  const results = await Promise.all(
    YIELD_SYMBOLS.map(async (sym) => {
      const yieldVal = await fetchYieldFromYahoo(sym.yahoo);
      return { maturity: sym.maturity, yield: yieldVal };
    })
  );
  for (const r of results) {
    if (r.yield !== null) {
      knownPoints.set(r.maturity, r.yield);
    }
  }
  return knownPoints;
}

async function fetchHistoricalYahoo(dateStr: string): Promise<Map<string, number>> {
  const date = new Date(dateStr);
  const period1 = Math.floor(date.getTime() / 1000) - 86400;
  const period2 = Math.floor(date.getTime() / 1000) + 86400;
  const knownPoints = new Map<string, number>();

  for (const sym of YIELD_SYMBOLS) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym.yahoo)}?period1=${period1}&period2=${period2}&interval=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)' },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
      const validClose = closes.find((c: number | null) => c !== null);
      if (validClose != null) {
        knownPoints.set(sym.maturity, Math.round(validClose * 100) / 100);
      }
    } catch {
      // Skip
    }
  }
  return knownPoints;
}

// --- Interpolation ---

function interpolateYieldCurve(knownPoints: Map<string, number>): YieldPoint[] {
  const maturityToYears: Record<string, number> = {
    '1m': 1 / 12, '2m': 2 / 12, '3m': 0.25, '6m': 0.5, '1y': 1, '2y': 2, '3y': 3,
    '5y': 5, '7y': 7, '10y': 10, '20y': 20, '30y': 30,
  };

  const maturityLabels: Record<string, string> = {
    '1m': '1M', '2m': '2M', '3m': '3M', '6m': '6M', '1y': '1Y', '2y': '2Y', '3y': '3Y',
    '5y': '5Y', '7y': '7Y', '10y': '10Y', '20y': '20Y', '30y': '30Y',
  };

  const sorted = Array.from(knownPoints.entries())
    .map(([m, y]) => ({ mat: m, years: maturityToYears[m] || 0, yieldVal: y }))
    .sort((a, b) => a.years - b.years);

  if (sorted.length === 0) return [];

  const curve: YieldPoint[] = [];

  for (const mat of ALL_MATURITIES) {
    const years = maturityToYears[mat];
    if (knownPoints.has(mat)) {
      curve.push({ maturity: mat, label: maturityLabels[mat], yield: knownPoints.get(mat)! });
    } else {
      let lower = sorted[0];
      let upper = sorted[sorted.length - 1];
      for (const pt of sorted) {
        if (pt.years <= years) lower = pt;
        if (pt.years >= years && upper.years >= pt.years) { upper = pt; break; }
      }
      if (lower === upper) {
        curve.push({ maturity: mat, label: maturityLabels[mat], yield: lower.yieldVal });
      } else {
        const ratio = (years - lower.years) / (upper.years - lower.years);
        const interpolated = lower.yieldVal + ratio * (upper.yieldVal - lower.yieldVal);
        curve.push({ maturity: mat, label: maturityLabels[mat], yield: Math.round(interpolated * 100) / 100 });
      }
    }
  }

  return curve;
}

// --- Combined fetch: Massive → Yahoo → Fallback ---

async function fetchCurrentYields(): Promise<YieldPoint[]> {
  // Try Massive.com first
  const massivePoints = await fetchFromMassive();
  if (massivePoints && massivePoints.size > 0) {
    return interpolateYieldCurve(massivePoints);
  }

  // Fallback to Yahoo Finance
  const yahooPoints = await fetchYahooYields();
  if (yahooPoints.size > 0) {
    return interpolateYieldCurve(yahooPoints);
  }

  return getFallbackCurve();
}

async function fetchComparisonYields(compareDate: string): Promise<YieldPoint[] | null> {
  // Try Massive.com first
  const massivePoints = await fetchFromMassive(compareDate);
  if (massivePoints && massivePoints.size > 0) {
    return interpolateYieldCurve(massivePoints);
  }

  // Fallback to Yahoo Finance historical
  const yahooPoints = await fetchHistoricalYahoo(compareDate);
  if (yahooPoints.size > 0) {
    return interpolateYieldCurve(yahooPoints);
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const compareDate = searchParams.get('compareDate');

  const cacheKey = `yields:current:${compareDate || 'none'}`;
  if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const currentCurve = await fetchCurrentYields();

    let comparisonCurve: YieldPoint[] | null = null;
    if (compareDate) {
      comparisonCurve = await fetchComparisonYields(compareDate);
    }

    const response = {
      current: currentCurve,
      currentDate: new Date().toISOString().split('T')[0],
      comparison: comparisonCurve,
      comparisonDate: compareDate || null,
    };

    cache = { data: response, timestamp: Date.now(), key: cacheKey };
    return NextResponse.json(response);
  } catch {
    return NextResponse.json({
      current: getFallbackCurve(),
      currentDate: new Date().toISOString().split('T')[0],
      comparison: null,
      comparisonDate: null,
    });
  }
}

function getFallbackCurve(): YieldPoint[] {
  return [
    { maturity: '1m', label: '1M', yield: 5.30 },
    { maturity: '3m', label: '3M', yield: 5.25 },
    { maturity: '6m', label: '6M', yield: 5.10 },
    { maturity: '1y', label: '1Y', yield: 4.85 },
    { maturity: '2y', label: '2Y', yield: 4.55 },
    { maturity: '3y', label: '3Y', yield: 4.35 },
    { maturity: '5y', label: '5Y', yield: 4.20 },
    { maturity: '7y', label: '7Y', yield: 4.25 },
    { maturity: '10y', label: '10Y', yield: 4.30 },
    { maturity: '20y', label: '20Y', yield: 4.55 },
    { maturity: '30y', label: '30Y', yield: 4.50 },
  ];
}
