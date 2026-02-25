import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface YieldPoint {
  maturity: string;
  label: string;
  yield: number;
}

interface HistoricalYieldResponse {
  pre: { points: YieldPoint[]; date: string };
  ipca: { points: YieldPoint[]; date: string };
}

// ---------------------------------------------------------------------------
// BCB SGS – ETTJ PRE series (medium / long end)
// ---------------------------------------------------------------------------
const BCB_ETTJ_PRE_SERIES: { seriesId: number; maturityYears: number; maturity: string; label: string }[] = [
  { seriesId: 12466, maturityYears: 1,  maturity: '1y',  label: '1Y'  },
  { seriesId: 12467, maturityYears: 2,  maturity: '2y',  label: '2Y'  },
  { seriesId: 12468, maturityYears: 3,  maturity: '3y',  label: '3Y'  },
  { seriesId: 12469, maturityYears: 4,  maturity: '4y',  label: '4Y'  },
  { seriesId: 12470, maturityYears: 5,  maturity: '5y',  label: '5Y'  },
  { seriesId: 12471, maturityYears: 7,  maturity: '7y',  label: '7Y'  },
  { seriesId: 12472, maturityYears: 10, maturity: '10y', label: '10Y' },
];

// ---------------------------------------------------------------------------
// BCB SGS – ETTJ IPCA series (inflation-linked yield curve)
// ---------------------------------------------------------------------------
const BCB_ETTJ_IPCA_SERIES: { seriesId: number; maturityYears: number; maturity: string; label: string }[] = [
  { seriesId: 12464, maturityYears: 1,  maturity: '1y',  label: '1Y'  },
  { seriesId: 12465, maturityYears: 2,  maturity: '2y',  label: '2Y'  },
  { seriesId: 12473, maturityYears: 3,  maturity: '3y',  label: '3Y'  },
  { seriesId: 12474, maturityYears: 5,  maturity: '5y',  label: '5Y'  },
  { seriesId: 12475, maturityYears: 10, maturity: '10y', label: '10Y' },
];

// ---------------------------------------------------------------------------
// BCB SGS – DI Swap short-end series (for PRE curve short maturities)
// ---------------------------------------------------------------------------
const BCB_DI_SWAP_SERIES: { seriesId: number; maturityYears: number; maturity: string; label: string }[] = [
  { seriesId: 432,  maturityYears: 0,         maturity: '0d',  label: 'Selic' },
  { seriesId: 4389, maturityYears: 1 / 12,    maturity: '1m',  label: '1M'   },
  { seriesId: 4390, maturityYears: 2 / 12,    maturity: '2m',  label: '2M'   },
  { seriesId: 4391, maturityYears: 3 / 12,    maturity: '3m',  label: '3M'   },
  { seriesId: 4392, maturityYears: 6 / 12,    maturity: '6m',  label: '6M'   },
  { seriesId: 4393, maturityYears: 1,          maturity: '1y',  label: '1Y'   },
];

// ---------------------------------------------------------------------------
// Desired output maturities
// ---------------------------------------------------------------------------
const PRE_MATURITIES: { maturityYears: number; maturity: string; label: string }[] = [
  { maturityYears: 1 / 12,    maturity: '1m',  label: '1M'  },
  { maturityYears: 2 / 12,    maturity: '2m',  label: '2M'  },
  { maturityYears: 3 / 12,    maturity: '3m',  label: '3M'  },
  { maturityYears: 6 / 12,    maturity: '6m',  label: '6M'  },
  { maturityYears: 1,         maturity: '1y',  label: '1Y'  },
  { maturityYears: 2,         maturity: '2y',  label: '2Y'  },
  { maturityYears: 3,         maturity: '3y',  label: '3Y'  },
  { maturityYears: 5,         maturity: '5y',  label: '5Y'  },
  { maturityYears: 7,         maturity: '7y',  label: '7Y'  },
  { maturityYears: 10,        maturity: '10y', label: '10Y' },
];

const IPCA_MATURITIES: { maturityYears: number; maturity: string; label: string }[] = [
  { maturityYears: 1,  maturity: '1y',  label: '1Y'  },
  { maturityYears: 2,  maturity: '2y',  label: '2Y'  },
  { maturityYears: 3,  maturity: '3y',  label: '3Y'  },
  { maturityYears: 5,  maturity: '5y',  label: '5Y'  },
  { maturityYears: 10, maturity: '10y', label: '10Y' },
];

// ---------------------------------------------------------------------------
// In-memory cache – keyed by date string, 1-hour TTL
// ---------------------------------------------------------------------------
interface CacheEntry {
  data: HistoricalYieldResponse;
  timestamp: number;
}

const dateCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Convert YYYY-MM-DD to DD/MM/YYYY for BCB API */
function toBCBDateFormat(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** Convert DD/MM/YYYY to YYYY-MM-DD */
function fromBCBDateFormat(bcbDate: string): string {
  const [day, month, year] = bcbDate.split('/');
  return `${year}-${month}-${day}`;
}

/** Subtract N business days from a YYYY-MM-DD date (skip weekends) */
function subtractBusinessDays(isoDate: string, days: number): string {
  const date = new Date(isoDate + 'T12:00:00Z');
  let remaining = days;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() - 1);
    const dow = date.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      remaining--;
    }
  }
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Fetch a single BCB SGS series for a specific date
// ---------------------------------------------------------------------------
async function fetchBCBSeriesForDate(
  seriesId: number,
  dateISO: string
): Promise<{ value: number; date: string } | null> {
  try {
    const bcbDate = toBCBDateFormat(dateISO);
    const url =
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados?formato=json` +
      `&dataInicial=${bcbDate}&dataFinal=${bcbDate}`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AsseFinDashboard/1.0)',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      // Take the last entry for the date range (should be only one)
      const entry = data[data.length - 1];
      const value = parseFloat(String(entry.valor).replace(',', '.'));
      if (isNaN(value)) return null;
      return { value, date: entry.data };
    }
    return null;
  } catch {
    return null;
  }
}

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
// Build a full yield curve from known anchor points using cubic spline
// ---------------------------------------------------------------------------
function buildCurveWithSpline(
  anchors: { maturityYears: number; yield: number }[],
  outputMaturities: { maturityYears: number; maturity: string; label: string }[]
): YieldPoint[] {
  if (anchors.length === 0) return [];

  const sorted = [...anchors].sort((a, b) => a.maturityYears - b.maturityYears);
  const xs = sorted.map((p) => p.maturityYears);
  const ys = sorted.map((p) => p.yield);

  const queryXs = outputMaturities.map((m) => m.maturityYears);
  const interpolated = cubicSplineInterpolate(xs, ys, queryXs);

  return outputMaturities.map((m, i) => ({
    maturity: m.maturity,
    label: m.label,
    yield: Math.round(interpolated[i] * 100) / 100,
  }));
}

// ---------------------------------------------------------------------------
// Fetch all series for a specific date, returning anchors + actual date found
// ---------------------------------------------------------------------------
async function fetchCurveForDate(
  seriesList: { seriesId: number; maturityYears: number; maturity: string; label: string }[],
  dateISO: string
): Promise<{ anchors: { maturityYears: number; yield: number }[]; date: string } | null> {
  const results = await Promise.all(
    seriesList.map(async (s) => ({
      ...s,
      data: await fetchBCBSeriesForDate(s.seriesId, dateISO),
    }))
  );

  const anchors: { maturityYears: number; yield: number }[] = [];
  let foundDate = '';

  for (const r of results) {
    if (r.data && !isNaN(r.data.value)) {
      anchors.push({ maturityYears: r.maturityYears, yield: r.data.value });
      if (r.data.date) foundDate = r.data.date;
    }
  }

  if (anchors.length === 0) return null;
  return { anchors, date: foundDate };
}

// ---------------------------------------------------------------------------
// Fetch historical PRE curve (DI swap short-end + ETTJ PRE long-end)
// ---------------------------------------------------------------------------
async function fetchHistoricalPre(
  dateISO: string
): Promise<{ points: YieldPoint[]; date: string } | null> {
  const [swapResult, ettjResult] = await Promise.all([
    fetchCurveForDate(BCB_DI_SWAP_SERIES, dateISO),
    fetchCurveForDate(BCB_ETTJ_PRE_SERIES, dateISO),
  ]);

  const anchors: { maturityYears: number; yield: number }[] = [];
  let latestDate = '';

  // Add short-end DI swap points (skip Selic at 0d)
  if (swapResult) {
    for (const a of swapResult.anchors) {
      if (a.maturityYears > 0) {
        anchors.push(a);
      }
    }
    if (swapResult.date) latestDate = swapResult.date;
  }

  // Add long-end ETTJ PRE points (prefer over DI swap at same maturity)
  if (ettjResult) {
    for (const a of ettjResult.anchors) {
      const idx = anchors.findIndex((e) => Math.abs(e.maturityYears - a.maturityYears) < 0.01);
      if (idx >= 0) anchors.splice(idx, 1);
      anchors.push(a);
    }
    if (ettjResult.date) latestDate = ettjResult.date;
  }

  if (anchors.length < 2) return null;

  const points = buildCurveWithSpline(anchors, PRE_MATURITIES);
  return points.length > 0 ? { points, date: latestDate } : null;
}

// ---------------------------------------------------------------------------
// Fetch historical IPCA curve
// ---------------------------------------------------------------------------
async function fetchHistoricalIPCA(
  dateISO: string
): Promise<{ points: YieldPoint[]; date: string } | null> {
  const result = await fetchCurveForDate(BCB_ETTJ_IPCA_SERIES, dateISO);
  if (!result || result.anchors.length < 2) return null;

  const points = buildCurveWithSpline(result.anchors, IPCA_MATURITIES);
  return points.length > 0 ? { points, date: result.date } : null;
}

// ---------------------------------------------------------------------------
// Try fetching for a date; if no data, try previous business days
// ---------------------------------------------------------------------------
async function fetchWithFallbackDates(
  dateISO: string
): Promise<HistoricalYieldResponse | null> {
  // Try the requested date first, then up to 5 previous business days
  const datesToTry = [dateISO];
  for (let i = 1; i <= 5; i++) {
    datesToTry.push(subtractBusinessDays(dateISO, i));
  }

  for (const tryDate of datesToTry) {
    const [pre, ipca] = await Promise.all([
      fetchHistoricalPre(tryDate),
      fetchHistoricalIPCA(tryDate),
    ]);

    // We consider the attempt successful if we got at least the PRE curve
    if (pre && pre.points.length >= 3) {
      const formattedDate = pre.date ? fromBCBDateFormat(pre.date) : tryDate;

      return {
        pre: { points: pre.points, date: formattedDate },
        ipca: ipca
          ? { points: ipca.points, date: ipca.date ? fromBCBDateFormat(ipca.date) : formattedDate }
          : { points: [], date: formattedDate },
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Static fallback data
// ---------------------------------------------------------------------------
function getFallbackResponse(dateISO: string): HistoricalYieldResponse {
  return {
    pre: {
      points: [
        { maturity: '1m',  label: '1M',  yield: 14.65 },
        { maturity: '2m',  label: '2M',  yield: 14.70 },
        { maturity: '3m',  label: '3M',  yield: 14.75 },
        { maturity: '6m',  label: '6M',  yield: 14.85 },
        { maturity: '1y',  label: '1Y',  yield: 14.95 },
        { maturity: '2y',  label: '2Y',  yield: 14.60 },
        { maturity: '3y',  label: '3Y',  yield: 14.20 },
        { maturity: '5y',  label: '5Y',  yield: 13.80 },
        { maturity: '7y',  label: '7Y',  yield: 13.50 },
        { maturity: '10y', label: '10Y', yield: 13.20 },
      ],
      date: dateISO,
    },
    ipca: {
      points: [
        { maturity: '1y',  label: '1Y',  yield: 7.50 },
        { maturity: '2y',  label: '2Y',  yield: 7.30 },
        { maturity: '3y',  label: '3Y',  yield: 7.10 },
        { maturity: '5y',  label: '5Y',  yield: 6.90 },
        { maturity: '10y', label: '10Y', yield: 6.70 },
      ],
      date: dateISO,
    },
  };
}

// ---------------------------------------------------------------------------
// GET /api/market/yields/brazil/historical?date=YYYY-MM-DD
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const dateParam = searchParams.get('date');

  // Validate the date parameter
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: 'Missing or invalid "date" query parameter. Expected format: YYYY-MM-DD' },
      { status: 400 }
    );
  }

  // Check per-date cache
  const cached = dateCache.get(dateParam);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const result = await fetchWithFallbackDates(dateParam);

    if (result) {
      // Store in per-date cache
      dateCache.set(dateParam, { data: result, timestamp: Date.now() });

      // Evict old cache entries to prevent unbounded memory growth
      if (dateCache.size > 100) {
        const now = Date.now();
        for (const [key, entry] of dateCache) {
          if (now - entry.timestamp > CACHE_TTL) {
            dateCache.delete(key);
          }
        }
      }

      return NextResponse.json(result);
    }

    // No data found for any tried date: return fallback
    const fallback = getFallbackResponse(dateParam);
    return NextResponse.json(fallback);
  } catch {
    const fallback = getFallbackResponse(dateParam);
    return NextResponse.json(fallback);
  }
}
