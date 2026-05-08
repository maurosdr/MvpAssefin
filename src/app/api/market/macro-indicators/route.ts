import { NextResponse } from 'next/server';

interface MacroMetric {
  value: number;
  date: string;
  label: string;
}

interface MacroCountryData {
  inflation: MacroMetric;
  unemployment: MacroMetric;
  interestRate: MacroMetric;
}

interface MacroIndicatorsResponse {
  us: MacroCountryData;
  br: MacroCountryData;
  lastUpdated: string;
}

let cache: { data: MacroIndicatorsResponse; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 min

// --- BCB (Banco Central do Brasil) ---

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
      return { value: parseFloat(data[0].valor), date: data[0].data };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchBrazilData(): Promise<MacroCountryData> {
  const [ipca, unemployment, selic] = await Promise.all([
    fetchBCBSeries(13522), // IPCA acumulado 12 meses
    fetchBCBSeries(24369), // Desemprego PNAD Contínua
    fetchBCBSeries(432),   // Meta Selic
  ]);

  return {
    inflation: {
      value: ipca?.value ?? 5.53,
      date: ipca?.date ?? '',
      label: 'IPCA 12m',
    },
    unemployment: {
      value: unemployment?.value ?? 6.2,
      date: unemployment?.date ?? '',
      label: 'Desemprego',
    },
    interestRate: {
      value: selic?.value ?? 14.75,
      date: selic?.date ?? '',
      label: 'Selic',
    },
  };
}

// --- FRED (Federal Reserve Economic Data) ---
// Requer FRED_API_KEY no .env — gratuito em fred.stlouisfed.org/docs/api/api_key.html

async function fetchFREDObs(seriesId: string, limit: number): Promise<Array<{ value: number; date: string }>> {
  const fredKey = process.env.FRED_API_KEY;
  if (!fredKey) return [];

  try {
    const url = new URL('https://api.stlouisfed.org/fred/series/observations');
    url.searchParams.set('series_id', seriesId);
    url.searchParams.set('api_key', fredKey);
    url.searchParams.set('file_type', 'json');
    url.searchParams.set('sort_order', 'desc');
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const obs: Array<{ value: string; date: string }> = json?.observations ?? [];
    return obs
      .filter(o => o.value !== '.')
      .map(o => ({ value: parseFloat(o.value), date: o.date }));
  } catch {
    return [];
  }
}

// CPI YoY calculado de 13 meses do CPIAUCSL (CPIAUCSL é índice, não taxa)
async function fetchFREDCPIYoY(): Promise<{ value: number; date: string } | null> {
  const obs = await fetchFREDObs('CPIAUCSL', 13);
  if (obs.length < 13) return null;
  const current = obs[0].value;
  const yearAgo = obs[12].value;
  if (!yearAgo || isNaN(current) || isNaN(yearAgo)) return null;
  return {
    value: ((current / yearAgo) - 1) * 100,
    date: obs[0].date,
  };
}

async function fetchFREDLatest(seriesId: string): Promise<{ value: number; date: string } | null> {
  const obs = await fetchFREDObs(seriesId, 1);
  return obs[0] ?? null;
}

// --- BLS (Bureau of Labor Statistics) — gratuito, sem API key ---
// Fonte oficial do governo US para CPI e Desemprego

interface BLSResult {
  cpi: { value: number; date: string } | null;
  unemployment: { value: number; date: string } | null;
}

async function fetchBLSData(): Promise<BLSResult> {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const res = await fetch('https://api.bls.gov/publicAPI/v1/timeseries/data/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seriesid: [
          'CUUR0000SA0',   // CPI All Urban Consumers (not seasonally adjusted)
          'LNS14000000',   // Unemployment Rate (seasonally adjusted)
        ],
        startyear: String(currentYear - 1),
        endyear: String(currentYear),
      }),
    });
    if (!res.ok) return { cpi: null, unemployment: null };
    const json = await res.json();
    if (json.status !== 'REQUEST_SUCCEEDED') return { cpi: null, unemployment: null };

    let cpi: { value: number; date: string } | null = null;
    let unemployment: { value: number; date: string } | null = null;

    for (const series of json.Results?.series ?? []) {
      const data: Array<{ year: string; period: string; value: string }> = series.data ?? [];
      if (!data.length) continue;

      if (series.seriesID === 'CUUR0000SA0') {
        // Compute YoY: most recent month vs same month last year
        const latest = data[0];
        const yearAgo = data.find(
          d => d.year === String(parseInt(latest.year) - 1) && d.period === latest.period
        );
        if (latest && yearAgo) {
          const yoy = ((parseFloat(latest.value) / parseFloat(yearAgo.value)) - 1) * 100;
          const month = latest.period.replace('M', '').padStart(2, '0');
          cpi = { value: yoy, date: `${latest.year}-${month}` };
        }
      }

      if (series.seriesID === 'LNS14000000') {
        const latest = data[0];
        const month = latest.period.replace('M', '').padStart(2, '0');
        unemployment = { value: parseFloat(latest.value), date: `${latest.year}-${month}` };
      }
    }

    return { cpi, unemployment };
  } catch {
    return { cpi: null, unemployment: null };
  }
}

// --- Yahoo Finance --- fallback para Fed Funds via T-bill de 13 semanas

async function fetchYahooQuote(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

// --- US Data: FRED (com key) → BLS (sem key) → Yahoo (Fed Funds) ---

async function fetchUSData(): Promise<MacroCountryData> {
  // Tentar FRED (requer FRED_API_KEY no .env)
  const [fredCPI, fredUnemployment, fredFedFunds] = await Promise.all([
    fetchFREDCPIYoY(),
    fetchFREDLatest('UNRATE'),
    fetchFREDLatest('FEDFUNDS'),
  ]);

  // BLS como fallback gratuito (sem key) para CPI e Desemprego
  let blsCPI: { value: number; date: string } | null = null;
  let blsUnemployment: { value: number; date: string } | null = null;
  if (!fredCPI || !fredUnemployment) {
    const bls = await fetchBLSData();
    blsCPI = bls.cpi;
    blsUnemployment = bls.unemployment;
  }

  // Yahoo Finance como fallback para Fed Funds
  let fedRate = fredFedFunds?.value ?? null;
  if (fedRate === null) {
    fedRate = await fetchYahooQuote('^IRX');
  }

  return {
    inflation: {
      value: fredCPI?.value ?? blsCPI?.value ?? 2.4,
      date: fredCPI?.date ?? blsCPI?.date ?? '',
      label: 'CPI YoY',
    },
    unemployment: {
      value: fredUnemployment?.value ?? blsUnemployment?.value ?? 4.2,
      date: fredUnemployment?.date ?? blsUnemployment?.date ?? '',
      label: 'Unemployment',
    },
    interestRate: {
      value: fedRate ?? 4.33,
      date: fredFedFunds?.date ?? '',
      label: 'Fed Funds',
    },
  };
}

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const [us, br] = await Promise.all([fetchUSData(), fetchBrazilData()]);

    const response: MacroIndicatorsResponse = {
      us,
      br,
      lastUpdated: new Date().toISOString(),
    };

    cache = { data: response, timestamp: Date.now() };
    return NextResponse.json(response);
  } catch {
    return NextResponse.json(getFallbackIndicators());
  }
}

function getFallbackIndicators(): MacroIndicatorsResponse {
  return {
    us: {
      inflation:     { value: 2.4,  date: '', label: 'CPI YoY' },
      unemployment:  { value: 4.2,  date: '', label: 'Unemployment' },
      interestRate:  { value: 4.33, date: '', label: 'Fed Funds' },
    },
    br: {
      inflation:     { value: 5.53, date: '', label: 'IPCA 12m' },
      unemployment:  { value: 6.2,  date: '', label: 'Desemprego' },
      interestRate:  { value: 14.75, date: '', label: 'Selic' },
    },
    lastUpdated: new Date().toISOString(),
  };
}
