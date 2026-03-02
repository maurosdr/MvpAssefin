import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// BCB Focus – Market Expectations (Olinda API)
// Docs: https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/
// ---------------------------------------------------------------------------

const BASE_URL = 'https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata';

export interface FocusExpectation {
  indicator: string;
  date: string;          // reference date of the projection
  referenceDate: string; // survey date
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  stddev: number | null;
}

export interface FocusData {
  annual: FocusExpectation[];
  monthly: FocusExpectation[];
  updatedAt: string;
}

let cache: { data: FocusData; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Indicators to fetch
const ANNUAL_INDICATORS = ['IPCA', 'PIB Total', 'Selic', 'Câmbio'];
const MONTHLY_INDICATORS = ['IPCA', 'Selic'];

// ---------------------------------------------------------------------------
// Fetch annual expectations (ExpectativasMercadoAnuais)
// Returns the median/mean projections for upcoming calendar years
// ---------------------------------------------------------------------------
async function fetchAnnualExpectations(
  indicator: string
): Promise<FocusExpectation[]> {
  try {
    const params = new URLSearchParams({
      $top: '10',
      $filter: `Indicador eq '${indicator}' and Suavizado eq 'S'`,
      $orderby: 'Data desc,DataReferencia asc',
      $format: 'json',
      $select: 'Indicador,Data,DataReferencia,Mediana,Media,Minimo,Maximo,DesvioPadrao',
    });

    const res = await fetch(`${BASE_URL}/ExpectativasMercadoAnuais?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AsseFinDashboard/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];
    const json = await res.json();
    const items: Record<string, string | number>[] = json?.value ?? [];

    // Group by DataReferencia, keep only the most recent Data per reference year
    const byRef = new Map<string, Record<string, string | number>>();
    for (const item of items) {
      const ref = String(item.DataReferencia);
      if (!byRef.has(ref)) byRef.set(ref, item);
    }

    return Array.from(byRef.values())
      .slice(0, 5) // up to 5 future years
      .map((item) => ({
        indicator: String(item.Indicador),
        date: String(item.Data),
        referenceDate: String(item.DataReferencia),
        mean:    item.Media    != null ? Number(item.Media)    : null,
        median:  item.Mediana  != null ? Number(item.Mediana)  : null,
        min:     item.Minimo   != null ? Number(item.Minimo)   : null,
        max:     item.Maximo   != null ? Number(item.Maximo)   : null,
        stddev:  item.DesvioPadrao != null ? Number(item.DesvioPadrao) : null,
      }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Fetch monthly expectations (ExpectativasMercadoMensais)
// Returns the most recent projections for the next few months
// ---------------------------------------------------------------------------
async function fetchMonthlyExpectations(
  indicator: string
): Promise<FocusExpectation[]> {
  try {
    // Fetch the latest survey date first, then filter by it
    const today = new Date();
    const yyyymm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const params = new URLSearchParams({
      $top: '12',
      $filter: `Indicador eq '${indicator}' and Suavizado eq 'S'`,
      $orderby: 'Data desc,DataReferencia asc',
      $format: 'json',
      $select: 'Indicador,Data,DataReferencia,Mediana,Media,Minimo,Maximo,DesvioPadrao',
    });

    const res = await fetch(`${BASE_URL}/ExpectativasMercadoMensais?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AsseFinDashboard/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];
    const json = await res.json();
    const items: Record<string, string | number>[] = json?.value ?? [];

    // Keep unique reference months, sorted ascending
    const byRef = new Map<string, Record<string, string | number>>();
    for (const item of items) {
      const ref = String(item.DataReferencia);
      if (!byRef.has(ref)) byRef.set(ref, item);
    }

    return Array.from(byRef.values())
      .filter((item) => String(item.DataReferencia) >= yyyymm)
      .slice(0, 6)
      .map((item) => ({
        indicator: String(item.Indicador),
        date: String(item.Data),
        referenceDate: String(item.DataReferencia),
        mean:    item.Media    != null ? Number(item.Media)    : null,
        median:  item.Mediana  != null ? Number(item.Mediana)  : null,
        min:     item.Minimo   != null ? Number(item.Minimo)   : null,
        max:     item.Maximo   != null ? Number(item.Maximo)   : null,
        stddev:  item.DesvioPadrao != null ? Number(item.DesvioPadrao) : null,
      }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------
export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // Fetch all indicators in parallel
    const [annualResults, monthlyResults] = await Promise.all([
      Promise.all(ANNUAL_INDICATORS.map((ind) => fetchAnnualExpectations(ind))),
      Promise.all(MONTHLY_INDICATORS.map((ind) => fetchMonthlyExpectations(ind))),
    ]);

    const annual = annualResults.flat();
    const monthly = monthlyResults.flat();

    const data: FocusData = {
      annual,
      monthly,
      updatedAt: new Date().toISOString(),
    };

    cache = { data, timestamp: Date.now() };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch Focus data', annual: [], monthly: [], updatedAt: new Date().toISOString() },
      { status: 200 } // return 200 with empty data so UI doesn't crash
    );
  }
}
