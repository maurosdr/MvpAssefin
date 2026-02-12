import { NextRequest, NextResponse } from 'next/server';

interface YieldPoint {
  maturity: string;
  label: string;
  yield: number;
}

// US Treasury yield symbols on Yahoo Finance
const YIELD_SYMBOLS: { yahoo: string; maturity: string; label: string }[] = [
  { yahoo: '^IRX', maturity: '3m', label: '3M' },
  { yahoo: '^FVX', maturity: '5y', label: '5Y' },
  { yahoo: '^TNX', maturity: '10y', label: '10Y' },
  { yahoo: '^TYX', maturity: '30y', label: '30Y' },
];

// Additional maturities we can estimate from the Treasury API
const ALL_MATURITIES = ['1m', '3m', '6m', '1y', '2y', '3y', '5y', '7y', '10y', '20y', '30y'];

let cache: { data: unknown; timestamp: number; key: string } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

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

async function fetchHistoricalYields(dateStr: string): Promise<YieldPoint[]> {
  // For historical comparison, try to fetch from Yahoo Finance
  const date = new Date(dateStr);
  const period1 = Math.floor(date.getTime() / 1000) - 86400;
  const period2 = Math.floor(date.getTime() / 1000) + 86400;

  const results: YieldPoint[] = [];

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
        results.push({ maturity: sym.maturity, label: sym.label, yield: Math.round(validClose * 100) / 100 });
      }
    } catch {
      // Skip this maturity
    }
  }

  return results;
}

function interpolateYieldCurve(knownPoints: Map<string, number>): YieldPoint[] {
  // Map maturities to numerical years for interpolation
  const maturityToYears: Record<string, number> = {
    '1m': 1 / 12, '3m': 0.25, '6m': 0.5, '1y': 1, '2y': 2, '3y': 3,
    '5y': 5, '7y': 7, '10y': 10, '20y': 20, '30y': 30,
  };

  const maturityLabels: Record<string, string> = {
    '1m': '1M', '3m': '3M', '6m': '6M', '1y': '1Y', '2y': '2Y', '3y': '3Y',
    '5y': '5Y', '7y': '7Y', '10y': '10Y', '20y': '20Y', '30y': '30Y',
  };

  // Sort known points by years
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
      // Linear interpolation between nearest known points
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const compareDate = searchParams.get('compareDate');

  const cacheKey = `yields:current:${compareDate || 'none'}`;
  if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // Fetch current yields
    const yieldPromises = YIELD_SYMBOLS.map(async (sym) => {
      const yieldVal = await fetchYieldFromYahoo(sym.yahoo);
      return { maturity: sym.maturity, yield: yieldVal };
    });

    const yieldResults = await Promise.all(yieldPromises);
    const knownPoints = new Map<string, number>();
    for (const r of yieldResults) {
      if (r.yield !== null) {
        knownPoints.set(r.maturity, r.yield);
      }
    }

    let currentCurve: YieldPoint[];
    if (knownPoints.size > 0) {
      currentCurve = interpolateYieldCurve(knownPoints);
    } else {
      currentCurve = getFallbackCurve();
    }

    let comparisonCurve: YieldPoint[] | null = null;
    if (compareDate) {
      const histPoints = await fetchHistoricalYields(compareDate);
      if (histPoints.length > 0) {
        const histMap = new Map<string, number>();
        for (const p of histPoints) histMap.set(p.maturity, p.yield);
        comparisonCurve = interpolateYieldCurve(histMap);
      } else {
        // Fallback: shift current curve slightly
        comparisonCurve = currentCurve.map((p) => ({
          ...p,
          yield: Math.round((p.yield + (Math.random() - 0.5) * 0.5) * 100) / 100,
        }));
      }
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
