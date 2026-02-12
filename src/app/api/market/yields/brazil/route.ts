import { NextResponse } from 'next/server';

interface YieldPoint {
  maturity: string;
  label: string;
  yield: number;
}

// BCB SGS series for DI Pre-fixado swap rates at different terms
const BCB_SWAP_SERIES: { seriesId: number; maturity: string; label: string }[] = [
  { seriesId: 432, maturity: '0d', label: 'Selic' },     // Selic target (overnight reference)
  { seriesId: 4389, maturity: '1m', label: '1M' },       // Swap DI x Pre 30 days
  { seriesId: 4390, maturity: '2m', label: '2M' },       // Swap DI x Pre 60 days
  { seriesId: 4391, maturity: '3m', label: '3M' },       // Swap DI x Pre 90 days
  { seriesId: 4392, maturity: '6m', label: '6M' },       // Swap DI x Pre 180 days
  { seriesId: 4393, maturity: '1y', label: '1Y' },       // Swap DI x Pre 360 days
];

// ANBIMA ETTJ vertex mapping: business days → label
const ANBIMA_VERTEX_MAP: Record<number, { maturity: string; label: string }> = {
  21: { maturity: '1m', label: '1M' },
  42: { maturity: '2m', label: '2M' },
  63: { maturity: '3m', label: '3M' },
  126: { maturity: '6m', label: '6M' },
  252: { maturity: '1y', label: '1Y' },
  504: { maturity: '2y', label: '2Y' },
  756: { maturity: '3y', label: '3Y' },
  1260: { maturity: '5y', label: '5Y' },
  2520: { maturity: '10y', label: '10Y' },
};

let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

async function fetchBCBSeries(seriesId: number): Promise<{ value: number; date: string } | null> {
  try {
    const res = await fetch(
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados/ultimos/1?formato=json`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)',
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      return {
        value: parseFloat(data[0].valor),
        date: data[0].data,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchBrazilYieldsFromBCB(): Promise<{ points: YieldPoint[]; date: string } | null> {
  try {
    const results = await Promise.all(
      BCB_SWAP_SERIES.map(async (series) => {
        const data = await fetchBCBSeries(series.seriesId);
        return { ...series, data };
      })
    );

    const points: YieldPoint[] = [];
    let latestDate = '';

    for (const r of results) {
      if (r.data && !isNaN(r.data.value) && r.maturity !== '0d') {
        points.push({
          maturity: r.maturity,
          label: r.label,
          yield: Math.round(r.data.value * 100) / 100,
        });
        if (r.data.date) latestDate = r.data.date;
      }
    }

    if (points.length > 0) {
      return { points, date: latestDate };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchBrazilYieldsFromANBIMA(): Promise<{ points: YieldPoint[]; date: string } | null> {
  try {
    // ANBIMA legacy endpoint returns semicolon-separated ETTJ data
    const res = await fetch('https://www.anbima.com.br/informacoes/est-termo/CZ-down.asp', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
    });
    if (!res.ok) return null;

    const text = await res.text();
    const lines = text.split('\n').filter(l => l.trim());

    // Find the PREFIXADOS section and extract vertices
    const points: YieldPoint[] = [];
    let date = '';
    let inVertices = false;

    for (const line of lines) {
      // Look for date in the data
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch && !date) {
        date = dateMatch[1];
      }

      // Look for vertex data lines (format: vertex;rate or similar)
      if (line.includes('Vertices') || line.includes('vertices')) {
        inVertices = true;
        continue;
      }

      if (inVertices) {
        const parts = line.split(';').map(p => p.trim());
        if (parts.length >= 2) {
          const vertex = parseInt(parts[0]);
          const rate = parseFloat(parts[1].replace(',', '.'));
          if (!isNaN(vertex) && !isNaN(rate) && ANBIMA_VERTEX_MAP[vertex]) {
            const mapping = ANBIMA_VERTEX_MAP[vertex];
            points.push({
              maturity: mapping.maturity,
              label: mapping.label,
              yield: Math.round(rate * 100) / 100,
            });
          }
        }
      }
    }

    if (points.length > 0) {
      return { points, date: date || new Date().toISOString().split('T')[0] };
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // Try BCB swap rates first (most reliable, free, no auth)
    const bcbData = await fetchBrazilYieldsFromBCB();
    if (bcbData && bcbData.points.length >= 3) {
      const response = {
        current: bcbData.points,
        currentDate: bcbData.date,
        comparison: null,
        comparisonDate: null,
      };
      cache = { data: response, timestamp: Date.now() };
      return NextResponse.json(response);
    }

    // Fallback: try ANBIMA ETTJ
    const anbimaData = await fetchBrazilYieldsFromANBIMA();
    if (anbimaData && anbimaData.points.length >= 3) {
      const response = {
        current: anbimaData.points,
        currentDate: anbimaData.date,
        comparison: null,
        comparisonDate: null,
      };
      cache = { data: response, timestamp: Date.now() };
      return NextResponse.json(response);
    }

    // Final fallback: static data
    const response = {
      current: getFallbackBrazilCurve(),
      currentDate: new Date().toISOString().split('T')[0],
      comparison: null,
      comparisonDate: null,
    };
    cache = { data: response, timestamp: Date.now() };
    return NextResponse.json(response);
  } catch {
    return NextResponse.json({
      current: getFallbackBrazilCurve(),
      currentDate: new Date().toISOString().split('T')[0],
      comparison: null,
      comparisonDate: null,
    });
  }
}

function getFallbackBrazilCurve(): YieldPoint[] {
  return [
    { maturity: '1m', label: '1M', yield: 14.15 },
    { maturity: '2m', label: '2M', yield: 14.20 },
    { maturity: '3m', label: '3M', yield: 14.30 },
    { maturity: '6m', label: '6M', yield: 14.50 },
    { maturity: '1y', label: '1Y', yield: 14.75 },
    { maturity: '2y', label: '2Y', yield: 14.40 },
    { maturity: '3y', label: '3Y', yield: 14.00 },
    { maturity: '5y', label: '5Y', yield: 13.50 },
    { maturity: '10y', label: '10Y', yield: 13.00 },
  ];
}
