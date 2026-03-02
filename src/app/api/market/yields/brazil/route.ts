import { NextResponse } from 'next/server';

interface YieldPoint {
  maturity: string;
  label: string;
  yield: number;
}

// ---------------------------------------------------------------------------
// BCB SGS – Short end: DI Swap rates (confirmed series IDs)
// ---------------------------------------------------------------------------
const BCB_DI_SWAP_SERIES: { seriesId: number; maturityYears: number; maturity: string; label: string }[] = [
  { seriesId: 432,  maturityYears: 0,         maturity: '0d',  label: 'Selic' }, // overnight
  { seriesId: 4389, maturityYears: 1 / 12,    maturity: '1m',  label: '1M'   },
  { seriesId: 4390, maturityYears: 2 / 12,    maturity: '2m',  label: '2M'   },
  { seriesId: 4391, maturityYears: 3 / 12,    maturity: '3m',  label: '3M'   },
  { seriesId: 4392, maturityYears: 6 / 12,    maturity: '6m',  label: '6M'   },
  { seriesId: 4393, maturityYears: 1,         maturity: '1y',  label: '1Y'   },
];

// ---------------------------------------------------------------------------
// BCB SGS – Medium / long end: ETTJ Prefixado published by BCB/ANBIMA
// Business-day vertices and their approximate year equivalents
// Series IDs reference: BCB SGS catalog for "Estrutura a Termo - Prefixado"
// ---------------------------------------------------------------------------
const BCB_ETTJ_PRE_SERIES: { seriesId: number; maturityYears: number; maturity: string; label: string }[] = [
  { seriesId: 12466, maturityYears: 1,  maturity: '1y',  label: '1Y'  }, // 252 du
  { seriesId: 12467, maturityYears: 2,  maturity: '2y',  label: '2Y'  }, // 504 du
  { seriesId: 12468, maturityYears: 3,  maturity: '3y',  label: '3Y'  }, // 756 du
  { seriesId: 12469, maturityYears: 4,  maturity: '4y',  label: '4Y'  }, // 1008 du
  { seriesId: 12470, maturityYears: 5,  maturity: '5y',  label: '5Y'  }, // 1260 du
  { seriesId: 12471, maturityYears: 7,  maturity: '7y',  label: '7Y'  }, // 1764 du
  { seriesId: 12472, maturityYears: 10, maturity: '10y', label: '10Y' }, // 2520 du
];

// ---------------------------------------------------------------------------
// BCB SGS – ETTJ IPCA (inflation-linked yield curve)
// ---------------------------------------------------------------------------
const BCB_ETTJ_IPCA_SERIES: { seriesId: number; maturityYears: number; maturity: string; label: string }[] = [
  { seriesId: 12464, maturityYears: 1,  maturity: '1y',  label: '1Y'  }, // 252 du
  { seriesId: 12465, maturityYears: 2,  maturity: '2y',  label: '2Y'  }, // 504 du
  { seriesId: 12473, maturityYears: 3,  maturity: '3y',  label: '3Y'  }, // 756 du
  { seriesId: 12474, maturityYears: 5,  maturity: '5y',  label: '5Y'  }, // 1260 du
  { seriesId: 12475, maturityYears: 10, maturity: '10y', label: '10Y' }, // 2520 du
];

// Desired output maturities for PRE curve
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

// Desired output maturities for IPCA curve
const IPCA_MATURITIES: { maturityYears: number; maturity: string; label: string }[] = [
  { maturityYears: 1,  maturity: '1y',  label: '1Y'  },
  { maturityYears: 2,  maturity: '2y',  label: '2Y'  },
  { maturityYears: 3,  maturity: '3y',  label: '3Y'  },
  { maturityYears: 5,  maturity: '5y',  label: '5Y'  },
  { maturityYears: 10, maturity: '10y', label: '10Y' },
];

interface CacheEntry {
  pre: { points: YieldPoint[]; date: string } | null;
  ipca: { points: YieldPoint[]; date: string } | null;
  timestamp: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL = 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// Fetch a single BCB SGS series (latest value)
// ---------------------------------------------------------------------------
async function fetchBCBSeries(seriesId: number): Promise<{ value: number; date: string } | null> {
  try {
    const res = await fetch(
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados/ultimos/1?formato=json`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; AsseFinDashboard/1.0)',
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      const value = parseFloat(String(data[0].valor).replace(',', '.'));
      return isNaN(value) ? null : { value, date: data[0].data };
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
    // Linear fallback for two points
    const slope = (knownY[1] - knownY[0]) / (knownX[1] - knownX[0]);
    return queryX.map((x) => knownY[0] + slope * (x - knownX[0]));
  }

  // Step 1: compute h intervals
  const h: number[] = [];
  for (let i = 0; i < n - 1; i++) h.push(knownX[i + 1] - knownX[i]);

  // Step 2: build tridiagonal system for natural spline (second-derivative = 0 at endpoints)
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

  // Step 3: back substitution for c (second derivatives / 2)
  const c: number[] = new Array(n).fill(0);
  const b: number[] = new Array(n - 1).fill(0);
  const d: number[] = new Array(n - 1).fill(0);

  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (knownY[j + 1] - knownY[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  // Step 4: evaluate for each query point
  return queryX.map((x) => {
    // Find segment
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
// Fetch BCB ETTJ PRE curve (combines DI swap + ETTJ series)
// ---------------------------------------------------------------------------
async function fetchETTJPre(): Promise<{ points: YieldPoint[]; date: string } | null> {
  // Fetch both short-end and long-end concurrently
  const [swapResults, ettjResults] = await Promise.all([
    Promise.all(BCB_DI_SWAP_SERIES.map(async (s) => ({ ...s, data: await fetchBCBSeries(s.seriesId) }))),
    Promise.all(BCB_ETTJ_PRE_SERIES.map(async (s) => ({ ...s, data: await fetchBCBSeries(s.seriesId) }))),
  ]);

  const anchors: { maturityYears: number; yield: number }[] = [];
  let latestDate = '';

  // Add short-end DI swap points (skip Selic at 0d)
  for (const r of swapResults) {
    if (r.maturity !== '0d' && r.data && !isNaN(r.data.value)) {
      anchors.push({ maturityYears: r.maturityYears, yield: r.data.value });
      if (r.data.date) latestDate = r.data.date;
    }
  }

  // Add long-end ETTJ PRE points (prefer over DI swap when both exist)
  for (const r of ettjResults) {
    if (r.data && !isNaN(r.data.value)) {
      // Remove any existing anchor at the same maturity to avoid duplicates
      const idx = anchors.findIndex((a) => Math.abs(a.maturityYears - r.maturityYears) < 0.01);
      if (idx >= 0) anchors.splice(idx, 1);
      anchors.push({ maturityYears: r.maturityYears, yield: r.data.value });
      if (r.data.date) latestDate = r.data.date;
    }
  }

  if (anchors.length < 2) return null;

  const points = buildCurveWithSpline(anchors, PRE_MATURITIES);
  return points.length > 0 ? { points, date: latestDate } : null;
}

// ---------------------------------------------------------------------------
// Fetch BCB ETTJ IPCA curve
// ---------------------------------------------------------------------------
async function fetchETTJIPCA(): Promise<{ points: YieldPoint[]; date: string } | null> {
  const results = await Promise.all(
    BCB_ETTJ_IPCA_SERIES.map(async (s) => ({ ...s, data: await fetchBCBSeries(s.seriesId) }))
  );

  const anchors: { maturityYears: number; yield: number }[] = [];
  let latestDate = '';

  for (const r of results) {
    if (r.data && !isNaN(r.data.value)) {
      anchors.push({ maturityYears: r.maturityYears, yield: r.data.value });
      if (r.data.date) latestDate = r.data.date;
    }
  }

  if (anchors.length < 2) return null;

  const points = buildCurveWithSpline(anchors, IPCA_MATURITIES);
  return points.length > 0 ? { points, date: latestDate } : null;
}

// ---------------------------------------------------------------------------
// Fallback: scrape ANBIMA ETTJ (legacy endpoint)
// ---------------------------------------------------------------------------
async function fetchFromANBIMA(): Promise<{ points: YieldPoint[]; date: string } | null> {
  const ANBIMA_VERTEX_MAP: Record<number, { maturityYears: number; maturity: string; label: string }> = {
    21:   { maturityYears: 1/12,  maturity: '1m',  label: '1M'  },
    42:   { maturityYears: 2/12,  maturity: '2m',  label: '2M'  },
    63:   { maturityYears: 3/12,  maturity: '3m',  label: '3M'  },
    126:  { maturityYears: 6/12,  maturity: '6m',  label: '6M'  },
    252:  { maturityYears: 1,     maturity: '1y',  label: '1Y'  },
    504:  { maturityYears: 2,     maturity: '2y',  label: '2Y'  },
    756:  { maturityYears: 3,     maturity: '3y',  label: '3Y'  },
    1260: { maturityYears: 5,     maturity: '5y',  label: '5Y'  },
    2520: { maturityYears: 10,    maturity: '10y', label: '10Y' },
  };

  try {
    const res = await fetch('https://www.anbima.com.br/informacoes/est-termo/CZ-down.asp', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AsseFinDashboard/1.0)',
        Accept: 'text/html,application/xhtml+xml,*/*',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const text = await res.text();
    const lines = text.split('\n').filter((l) => l.trim());

    const anchors: { maturityYears: number; yield: number }[] = [];
    let date = '';

    for (const line of lines) {
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch && !date) date = dateMatch[1];

      const parts = line.split(';').map((p) => p.trim());
      if (parts.length >= 2) {
        const vertex = parseInt(parts[0]);
        const rate = parseFloat(parts[1].replace(',', '.'));
        if (!isNaN(vertex) && !isNaN(rate) && ANBIMA_VERTEX_MAP[vertex]) {
          anchors.push({ maturityYears: ANBIMA_VERTEX_MAP[vertex].maturityYears, yield: rate });
        }
      }
    }

    if (anchors.length < 2) return null;
    const points = buildCurveWithSpline(anchors, PRE_MATURITIES);
    return points.length > 0 ? { points, date: date || new Date().toISOString().split('T')[0] } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Static fallback
// ---------------------------------------------------------------------------
function getFallbackBrazilCurve(): YieldPoint[] {
  return [
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
  ];
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------
export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json({
      pre: cache.pre,
      ipca: cache.ipca,
      // Legacy compat: expose PRE as "current"
      current: cache.pre?.points ?? getFallbackBrazilCurve(),
      currentDate: cache.pre?.date ?? new Date().toISOString().split('T')[0],
      comparison: null,
      comparisonDate: null,
    });
  }

  try {
    // Fetch both curves in parallel
    const [preResult, ipcaResult] = await Promise.all([
      fetchETTJPre(),
      fetchETTJIPCA(),
    ]);

    // If BCB ETTJ PRE returned nothing useful, fall back to ANBIMA
    const finalPre = preResult && preResult.points.length >= 3
      ? preResult
      : await fetchFromANBIMA();

    const cacheEntry: CacheEntry = {
      pre:  finalPre  ?? { points: getFallbackBrazilCurve(), date: new Date().toISOString().split('T')[0] },
      ipca: ipcaResult && ipcaResult.points.length >= 2 ? ipcaResult : null,
      timestamp: Date.now(),
    };

    cache = cacheEntry;

    return NextResponse.json({
      pre: cacheEntry.pre,
      ipca: cacheEntry.ipca,
      current: cacheEntry.pre?.points ?? getFallbackBrazilCurve(),
      currentDate: cacheEntry.pre?.date ?? new Date().toISOString().split('T')[0],
      comparison: null,
      comparisonDate: null,
    });
  } catch {
    const fallback = getFallbackBrazilCurve();
    return NextResponse.json({
      pre:  { points: fallback, date: new Date().toISOString().split('T')[0] },
      ipca: null,
      current: fallback,
      currentDate: new Date().toISOString().split('T')[0],
      comparison: null,
      comparisonDate: null,
    });
  }
}
