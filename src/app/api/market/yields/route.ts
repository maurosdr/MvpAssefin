import { NextRequest, NextResponse } from 'next/server';

interface YieldPoint {
  maturity: string;
  label: string;
  yield: number;
}

const FRED_API_KEY = process.env.FRED_API_KEY || '';
const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY || '';

// FRED series IDs for US Treasury yields
const FRED_SERIES: { seriesId: string; maturityYears: number; maturity: string; label: string }[] = [
  { seriesId: 'DGS1MO',  maturityYears: 1 / 12,  maturity: '1m',  label: '1M'  },
  { seriesId: 'DGS3MO',  maturityYears: 3 / 12,  maturity: '3m',  label: '3M'  },
  { seriesId: 'DGS6MO',  maturityYears: 6 / 12,  maturity: '6m',  label: '6M'  },
  { seriesId: 'DGS1',    maturityYears: 1,        maturity: '1y',  label: '1Y'  },
  { seriesId: 'DGS2',    maturityYears: 2,        maturity: '2y',  label: '2Y'  },
  { seriesId: 'DGS3',    maturityYears: 3,        maturity: '3y',  label: '3Y'  },
  { seriesId: 'DGS5',    maturityYears: 5,        maturity: '5y',  label: '5Y'  },
  { seriesId: 'DGS7',    maturityYears: 7,        maturity: '7y',  label: '7Y'  },
  { seriesId: 'DGS10',   maturityYears: 10,       maturity: '10y', label: '10Y' },
  { seriesId: 'DGS20',   maturityYears: 20,       maturity: '20y', label: '20Y' },
  { seriesId: 'DGS30',   maturityYears: 30,       maturity: '30y', label: '30Y' },
];

// Mapping from Massive.com (Polygon.io) treasury yields response fields
const MASSIVE_FIELD_MAP: Record<string, { maturityYears: number; maturity: string; label: string }> = {
  '1month':  { maturityYears: 1/12,  maturity: '1m',  label: '1M'  },
  '2month':  { maturityYears: 2/12,  maturity: '2m',  label: '2M'  },
  '3month':  { maturityYears: 3/12,  maturity: '3m',  label: '3M'  },
  '6month':  { maturityYears: 6/12,  maturity: '6m',  label: '6M'  },
  '1year':   { maturityYears: 1,     maturity: '1y',  label: '1Y'  },
  '2year':   { maturityYears: 2,     maturity: '2y',  label: '2Y'  },
  '3year':   { maturityYears: 3,     maturity: '3y',  label: '3Y'  },
  '5year':   { maturityYears: 5,     maturity: '5y',  label: '5Y'  },
  '7year':   { maturityYears: 7,     maturity: '7y',  label: '7Y'  },
  '10year':  { maturityYears: 10,    maturity: '10y', label: '10Y' },
  '20year':  { maturityYears: 20,    maturity: '20y', label: '20Y' },
  '30year':  { maturityYears: 30,    maturity: '30y', label: '30Y' },
};

// Yahoo Finance fallback symbols
const YAHOO_SYMBOLS: { yahoo: string; maturityYears: number; maturity: string; label: string }[] = [
  { yahoo: '^IRX', maturityYears: 3/12, maturity: '3m',  label: '3M'  },
  { yahoo: '^FVX', maturityYears: 5,    maturity: '5y',  label: '5Y'  },
  { yahoo: '^TNX', maturityYears: 10,   maturity: '10y', label: '10Y' },
  { yahoo: '^TYX', maturityYears: 30,   maturity: '30y', label: '30Y' },
];

// Full set of output maturities
const OUTPUT_MATURITIES: { maturityYears: number; maturity: string; label: string }[] = [
  { maturityYears: 1/12,  maturity: '1m',  label: '1M'  },
  { maturityYears: 3/12,  maturity: '3m',  label: '3M'  },
  { maturityYears: 6/12,  maturity: '6m',  label: '6M'  },
  { maturityYears: 1,     maturity: '1y',  label: '1Y'  },
  { maturityYears: 2,     maturity: '2y',  label: '2Y'  },
  { maturityYears: 3,     maturity: '3y',  label: '3Y'  },
  { maturityYears: 5,     maturity: '5y',  label: '5Y'  },
  { maturityYears: 7,     maturity: '7y',  label: '7Y'  },
  { maturityYears: 10,    maturity: '10y', label: '10Y' },
  { maturityYears: 20,    maturity: '20y', label: '20Y' },
  { maturityYears: 30,    maturity: '30y', label: '30Y' },
];

let cache: { data: unknown; timestamp: number; key: string } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// Cubic Spline interpolation (natural spline: S''(x0) = S''(xn) = 0)
// ---------------------------------------------------------------------------
function cubicSplineInterpolate(
  knownX: number[],
  knownY: number[],
  queryX: number[]
): number[] {
  const n = knownX.length;
  if (n < 2) return queryX.map(() => knownY[0] ?? 0);
  if (n === 2) {
    const slope = (knownY[1] - knownY[0]) / (knownX[1] - knownX[0]);
    return queryX.map((x) => knownY[0] + slope * (x - knownX[0]));
  }

  const h: number[] = [];
  for (let i = 0; i < n - 1; i++) h.push(knownX[i + 1] - knownX[i]);

  const alpha: number[] = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    alpha[i] =
      (3 / h[i]) * (knownY[i + 1] - knownY[i]) -
      (3 / h[i - 1]) * (knownY[i] - knownY[i - 1]);
  }

  const l: number[] = new Array(n).fill(1);
  const mu: number[] = new Array(n).fill(0);
  const z: number[] = new Array(n).fill(0);

  for (let i = 1; i < n - 1; i++) {
    l[i] = 2 * (knownX[i + 1] - knownX[i - 1]) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }

  const c: number[] = new Array(n).fill(0);
  const b: number[] = new Array(n - 1).fill(0);
  const d: number[] = new Array(n - 1).fill(0);

  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (knownY[j + 1] - knownY[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  return queryX.map((x) => {
    let i = n - 2;
    for (let j = 0; j < n - 1; j++) {
      if (x <= knownX[j + 1]) { i = j; break; }
    }
    const dx = x - knownX[i];
    return knownY[i] + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx;
  });
}

// ---------------------------------------------------------------------------
// Build interpolated yield curve from anchor points
// ---------------------------------------------------------------------------
function buildCurveWithSpline(
  anchors: { maturityYears: number; yield: number }[]
): YieldPoint[] {
  if (anchors.length === 0) return [];

  const sorted = [...anchors].sort((a, b) => a.maturityYears - b.maturityYears);
  const xs = sorted.map((p) => p.maturityYears);
  const ys = sorted.map((p) => p.yield);

  const queryXs = OUTPUT_MATURITIES.map((m) => m.maturityYears);
  const interpolated = cubicSplineInterpolate(xs, ys, queryXs);

  return OUTPUT_MATURITIES.map((m, i) => ({
    maturity: m.maturity,
    label: m.label,
    yield: Math.round(interpolated[i] * 100) / 100,
  }));
}

// ---------------------------------------------------------------------------
// FRED API – fetch latest or historical observation for a single series
// ---------------------------------------------------------------------------
async function fetchFREDSeries(
  seriesId: string,
  observationDate?: string
): Promise<number | null> {
  if (!FRED_API_KEY) return null;
  try {
    const params = new URLSearchParams({
      series_id: seriesId,
      api_key: FRED_API_KEY,
      file_type: 'json',
      sort_order: 'desc',
      limit: '5',
    });
    if (observationDate) {
      params.set('observation_end', observationDate);
    }
    const res = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AsseFinDashboard/1.0)' },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const obs: { date: string; value: string }[] = json?.observations ?? [];
    // Find the most recent non-"." observation
    for (const o of obs) {
      if (o.value && o.value !== '.') {
        const v = parseFloat(o.value);
        if (!isNaN(v)) return v;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// FRED – fetch full curve (current or at a historical date)
// ---------------------------------------------------------------------------
async function fetchFromFRED(
  compareDate?: string
): Promise<{ anchors: { maturityYears: number; yield: number }[] } | null> {
  if (!FRED_API_KEY) return null;
  const results = await Promise.all(
    FRED_SERIES.map(async (s) => ({
      ...s,
      value: await fetchFREDSeries(s.seriesId, compareDate),
    }))
  );
  const anchors = results
    .filter((r) => r.value !== null)
    .map((r) => ({ maturityYears: r.maturityYears, yield: r.value! }));
  return anchors.length >= 3 ? { anchors } : null;
}

// ---------------------------------------------------------------------------
// Massive.com (Polygon.io) API
// ---------------------------------------------------------------------------
async function fetchFromMassive(
  compareDate?: string
): Promise<{ maturityYears: number; yield: number }[] | null> {
  if (!MASSIVE_API_KEY) return null;
  try {
    const params = new URLSearchParams({ apiKey: MASSIVE_API_KEY, limit: '1', sort: 'date', order: 'desc' });
    if (compareDate) params.set('date.lte', compareDate);
    const res = await fetch(
      `https://api.polygon.io/v1/economy/treasury-yields?${params.toString()}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AsseFinDashboard/1.0)' } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const results = json?.results;
    if (!Array.isArray(results) || results.length === 0) return null;
    const record = results[0];
    const anchors: { maturityYears: number; yield: number }[] = [];
    for (const [field, mapping] of Object.entries(MASSIVE_FIELD_MAP)) {
      if (record[field] != null && typeof record[field] === 'number') {
        anchors.push({ maturityYears: mapping.maturityYears, yield: record[field] });
      }
    }
    return anchors.length > 0 ? anchors : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Yahoo Finance fallback (current)
// ---------------------------------------------------------------------------
async function fetchYieldFromYahoo(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AsseFinDashboard/1.0)' } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.chart?.result?.[0]?.meta?.regularMarketPrice || null;
  } catch {
    return null;
  }
}

async function fetchYahooYields(): Promise<{ maturityYears: number; yield: number }[]> {
  const results = await Promise.all(
    YAHOO_SYMBOLS.map(async (s) => ({ maturityYears: s.maturityYears, value: await fetchYieldFromYahoo(s.yahoo) }))
  );
  return results.filter((r) => r.value !== null).map((r) => ({ maturityYears: r.maturityYears, yield: r.value! }));
}

async function fetchHistoricalYahoo(dateStr: string): Promise<{ maturityYears: number; yield: number }[]> {
  const date = new Date(dateStr);
  const period1 = Math.floor(date.getTime() / 1000) - 86400;
  const period2 = Math.floor(date.getTime() / 1000) + 86400;
  const anchors: { maturityYears: number; yield: number }[] = [];
  for (const sym of YAHOO_SYMBOLS) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym.yahoo)}?period1=${period1}&period2=${period2}&interval=1d`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AsseFinDashboard/1.0)' } });
      if (!res.ok) continue;
      const json = await res.json();
      const closes: (number | null)[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
      const validClose = closes.find((c) => c !== null);
      if (validClose != null) anchors.push({ maturityYears: sym.maturityYears, yield: Math.round(validClose * 100) / 100 });
    } catch { /* skip */ }
  }
  return anchors;
}

// ---------------------------------------------------------------------------
// Combined fetch strategies: FRED → Massive → Yahoo → Fallback
// ---------------------------------------------------------------------------
async function fetchCurrentYields(): Promise<YieldPoint[]> {
  const fredResult = await fetchFromFRED();
  if (fredResult && fredResult.anchors.length >= 3) {
    return buildCurveWithSpline(fredResult.anchors);
  }

  const massiveAnchors = await fetchFromMassive();
  if (massiveAnchors && massiveAnchors.length >= 3) {
    return buildCurveWithSpline(massiveAnchors);
  }

  const yahooAnchors = await fetchYahooYields();
  if (yahooAnchors.length > 0) {
    return buildCurveWithSpline(yahooAnchors);
  }

  return getFallbackCurve();
}

async function fetchComparisonYields(compareDate: string): Promise<YieldPoint[] | null> {
  const fredResult = await fetchFromFRED(compareDate);
  if (fredResult && fredResult.anchors.length >= 3) {
    return buildCurveWithSpline(fredResult.anchors);
  }

  const massiveAnchors = await fetchFromMassive(compareDate);
  if (massiveAnchors && massiveAnchors.length >= 3) {
    return buildCurveWithSpline(massiveAnchors);
  }

  const yahooAnchors = await fetchHistoricalYahoo(compareDate);
  if (yahooAnchors.length > 0) {
    return buildCurveWithSpline(yahooAnchors);
  }

  return null;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const compareDate = searchParams.get('compareDate');

  const cacheKey = `yields:us:${compareDate || 'none'}`;
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
    { maturity: '1m',  label: '1M',  yield: 5.30 },
    { maturity: '3m',  label: '3M',  yield: 5.25 },
    { maturity: '6m',  label: '6M',  yield: 5.10 },
    { maturity: '1y',  label: '1Y',  yield: 4.85 },
    { maturity: '2y',  label: '2Y',  yield: 4.55 },
    { maturity: '3y',  label: '3Y',  yield: 4.35 },
    { maturity: '5y',  label: '5Y',  yield: 4.20 },
    { maturity: '7y',  label: '7Y',  yield: 4.25 },
    { maturity: '10y', label: '10Y', yield: 4.30 },
    { maturity: '20y', label: '20Y', yield: 4.55 },
    { maturity: '30y', label: '30Y', yield: 4.50 },
  ];
}
