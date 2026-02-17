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

// --- BCB (Banco Central do Brasil) API ---

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

async function fetchBrazilData(): Promise<MacroCountryData> {
  const [ipca, unemployment, selic] = await Promise.all([
    fetchBCBSeries(13522),  // IPCA accumulated 12 months
    fetchBCBSeries(24369),  // Unemployment rate (PNAD Continua)
    fetchBCBSeries(432),    // Selic target rate
  ]);

  return {
    inflation: {
      value: ipca?.value ?? 4.50,
      date: ipca?.date ?? '',
      label: 'IPCA 12m',
    },
    unemployment: {
      value: unemployment?.value ?? 7.8,
      date: unemployment?.date ?? '',
      label: 'Desemprego',
    },
    interestRate: {
      value: selic?.value ?? 13.75,
      date: selic?.date ?? '',
      label: 'Selic',
    },
  };
}

// --- US data from Yahoo Finance (reliable, free) ---

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

// --- US data from FRED (free, requires optional API key) ---

async function fetchFREDSeries(seriesId: string): Promise<{ value: number; date: string } | null> {
  const fredKey = process.env.FRED_API_KEY;
  if (!fredKey) return null;

  try {
    const res = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredKey}&file_type=json&sort_order=desc&limit=1`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)' } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const obs = json?.observations?.[0];
    if (obs && obs.value !== '.') {
      return { value: parseFloat(obs.value), date: obs.date };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchUSData(): Promise<MacroCountryData> {
  // Try FRED first if key is available
  const [fredCPI, fredUnemployment, fredFedFunds] = await Promise.all([
    fetchFREDSeries('CPIAUCSL'),    // CPI Urban Consumers
    fetchFREDSeries('UNRATE'),      // Unemployment Rate
    fetchFREDSeries('FEDFUNDS'),    // Federal Funds Rate
  ]);

  // Calculate CPI YoY change (CPIAUCSL is an index, not a rate)
  // For simplicity, use the FRED annual rate series instead
  let cpiYoY: { value: number; date: string } | null = null;
  if (!fredCPI) {
    // Try the annual inflation rate from FRED
    cpiYoY = await fetchFREDSeries('FPCPITOTLZGUSA');
  }

  // Fallback: use Yahoo Finance for fed funds effective rate proxy
  let fedRate = fredFedFunds?.value ?? null;
  if (fedRate === null) {
    // ^IRX is the 13-week T-bill rate, close proxy for fed funds
    fedRate = await fetchYahooQuote('^IRX');
  }

  return {
    inflation: {
      value: cpiYoY?.value ?? fredCPI?.value ?? 3.0,
      date: cpiYoY?.date ?? fredCPI?.date ?? '',
      label: 'CPI YoY',
    },
    unemployment: {
      value: fredUnemployment?.value ?? 4.0,
      date: fredUnemployment?.date ?? '',
      label: 'Unemployment',
    },
    interestRate: {
      value: fedRate ?? 5.25,
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
    const fallback = getFallbackIndicators();
    return NextResponse.json(fallback);
  }
}

function getFallbackIndicators(): MacroIndicatorsResponse {
  return {
    us: {
      inflation: { value: 3.0, date: '2025-12', label: 'CPI YoY' },
      unemployment: { value: 4.0, date: '2025-12', label: 'Unemployment' },
      interestRate: { value: 5.25, date: '2025-12', label: 'Fed Funds' },
    },
    br: {
      inflation: { value: 4.50, date: '12/2025', label: 'IPCA 12m' },
      unemployment: { value: 7.8, date: '12/2025', label: 'Desemprego' },
      interestRate: { value: 13.75, date: '12/2025', label: 'Selic' },
    },
    lastUpdated: new Date().toISOString(),
  };
}
