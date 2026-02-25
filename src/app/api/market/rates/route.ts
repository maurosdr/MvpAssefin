import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// BCB SGS Series IDs
// ---------------------------------------------------------------------------
const SERIES = {
  SELIC: 432,     // Selic target rate (% p.a.)
  CDI:   4389,    // 1-month DI swap rate (proxy for CDI)
  IPCA:  13522,   // IPCA accumulated 12 months (% YoY)
};

// ---------------------------------------------------------------------------
// In-memory cache (30-minute TTL)
// ---------------------------------------------------------------------------
interface RatesCache {
  data: { selic: number; cdi: number; ipca: number; lastUpdated: string };
  timestamp: number;
}

let cache: RatesCache | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// Fallback values when BCB API is unreachable
// ---------------------------------------------------------------------------
const FALLBACK = {
  selic: 14.25,
  cdi:   14.15,
  ipca:  4.50,
};

// ---------------------------------------------------------------------------
// Fetch a single BCB SGS series (latest value)
// ---------------------------------------------------------------------------
async function fetchBCBSeries(seriesId: number): Promise<number | null> {
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
      return isNaN(value) ? null : value;
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// GET /api/market/rates
// ---------------------------------------------------------------------------
export async function GET() {
  // Return cached data if still valid
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // Fetch all three rates concurrently
    const [selic, cdi, ipca] = await Promise.all([
      fetchBCBSeries(SERIES.SELIC),
      fetchBCBSeries(SERIES.CDI),
      fetchBCBSeries(SERIES.IPCA),
    ]);

    const response = {
      selic: selic ?? FALLBACK.selic,
      cdi:   cdi   ?? FALLBACK.cdi,
      ipca:  ipca  ?? FALLBACK.ipca,
      lastUpdated: new Date().toISOString(),
    };

    cache = { data: response, timestamp: Date.now() };

    return NextResponse.json(response);
  } catch {
    // On total failure, return fallback values
    const fallback = {
      selic: cache?.data.selic ?? FALLBACK.selic,
      cdi:   cache?.data.cdi   ?? FALLBACK.cdi,
      ipca:  cache?.data.ipca  ?? FALLBACK.ipca,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(fallback);
  }
}
