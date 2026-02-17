import { NextRequest, NextResponse } from 'next/server';

interface YieldPoint {
  maturity: string;
  label: string;
  yield: number;
}

interface SelicRecord {
  Data: string;
  Reuniao: string;
  Mediana: number | null;
  numeroRespondentes: number | null;
}

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

// COPOM meets ~8 times/year. Approximate each meeting number to a calendar month (0-indexed).
// R1 ≈ Jan, R2 ≈ Mar, R3 ≈ May, R4 ≈ Jun, R5 ≈ Aug, R6 ≈ Sep, R7 ≈ Nov, R8 ≈ Dec
const MEETING_TO_MONTH: Record<number, number> = {
  1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 8, 7: 10, 8: 11,
};

function reuniaoToDate(reuniao: string): Date | null {
  const match = reuniao.match(/R(\d+)\/(\d{4})/i);
  if (!match) return null;
  const n = parseInt(match[1]);
  const year = parseInt(match[2]);
  const month = MEETING_TO_MONTH[n] ?? Math.min(Math.round((n - 1) * 1.5), 11);
  return new Date(year, month, 15);
}

function reuniaoToLabel(reuniao: string): string {
  const date = reuniaoToDate(reuniao);
  if (!date) return reuniao;
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

function monthsFromNow(date: Date): number {
  const now = new Date();
  return (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
}

function monthsToMaturityKey(months: number): string {
  if (months <= 1) return '1m';
  if (months <= 3) return '3m';
  if (months <= 6) return '6m';
  if (months <= 9) return '9m';
  if (months <= 12) return '1y';
  if (months <= 18) return '18m';
  if (months <= 24) return '2y';
  if (months <= 36) return '3y';
  return `${Math.round(months / 12)}y`;
}

// Primary source: BCB Focus market consensus — SELIC expectations by COPOM meeting
// Returns a forward SELIC curve (market's view of where the rate will be at each meeting)
async function fetchFromBCBExpectativas(): Promise<{ curve: YieldPoint[]; date: string } | null> {
  try {
    const url =
      'https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/' +
      'ExpectativasMercadoSelic?$top=200&$format=json';

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)' },
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const json = await res.json();
    const records: SelicRecord[] = json?.value ?? [];
    if (records.length === 0) return null;

    // Find the most recent survey date in the batch
    const latestDate = records
      .map((r) => r.Data)
      .sort()
      .at(-1)!;

    // Keep only records from that date with valid median
    const filtered = records.filter(
      (r) =>
        r.Data === latestDate &&
        r.Mediana != null &&
        (r.numeroRespondentes == null || r.numeroRespondentes >= 5),
    );

    // Sort meetings chronologically
    filtered.sort((a, b) => {
      const da = reuniaoToDate(a.Reuniao);
      const db = reuniaoToDate(b.Reuniao);
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });

    const curve: YieldPoint[] = [];
    for (const r of filtered) {
      const date = reuniaoToDate(r.Reuniao);
      if (!date) continue;
      const months = monthsFromNow(date);
      if (months < 0) continue; // skip past meetings
      curve.push({
        maturity: monthsToMaturityKey(months),
        label: reuniaoToLabel(r.Reuniao),
        yield: Math.round(r.Mediana! * 100) / 100,
      });
    }

    return curve.length >= 3 ? { curve, date: latestDate } : null;
  } catch {
    return null;
  }
}

// Fallback: BCB SGS series for short-term DI swap rates (actual traded rates, not forecasts)
const BCB_SGS_SERIES = [
  { seriesId: 4389, maturity: '1m', label: '1M' },
  { seriesId: 4390, maturity: '2m', label: '2M' },
  { seriesId: 4391, maturity: '3m', label: '3M' },
  { seriesId: 4392, maturity: '6m', label: '6M' },
  { seriesId: 4393, maturity: '1y', label: '1Y' },
];

async function fetchFromBCBSGS(): Promise<{ curve: YieldPoint[]; date: string } | null> {
  try {
    const results = await Promise.allSettled(
      BCB_SGS_SERIES.map(async (s) => {
        const res = await fetch(
          `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s.seriesId}/dados/ultimos/1?formato=json`,
          { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)' } },
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (!Array.isArray(data) || !data[0]) return null;
        return { ...s, value: parseFloat(data[0].valor), date: data[0].data as string };
      }),
    );

    const points: YieldPoint[] = [];
    let latestDate = '';

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value && !isNaN(r.value.value)) {
        points.push({
          maturity: r.value.maturity,
          label: r.value.label,
          yield: Math.round(r.value.value * 100) / 100,
        });
        if (r.value.date) latestDate = r.value.date;
      }
    }

    return points.length >= 3 ? { curve: points, date: latestDate } : null;
  } catch {
    return null;
  }
}

function getFallbackCurve(): YieldPoint[] {
  // Approximate market consensus as of early 2026 (SELIC ~14.75%, gradually declining)
  return [
    { maturity: '3m',  label: 'mar/26', yield: 14.75 },
    { maturity: '6m',  label: 'mai/26', yield: 14.75 },
    { maturity: '9m',  label: 'ago/26', yield: 14.50 },
    { maturity: '1y',  label: 'set/26', yield: 14.25 },
    { maturity: '18m', label: 'fev/27', yield: 13.50 },
    { maturity: '2y',  label: 'ago/27', yield: 12.75 },
    { maturity: '3y',  label: 'ago/28', yield: 11.50 },
  ];
}

// Fetch BCB Expectativas data for a specific date, stepping back up to 5 days for weekends/holidays
async function fetchHistoricalBCBExpectativas(
  date: string,
): Promise<{ curve: YieldPoint[]; date: string } | null> {
  for (let offset = 0; offset < 5; offset++) {
    try {
      const d = new Date(date);
      d.setDate(d.getDate() - offset);
      const isoDate = d.toISOString().split('T')[0];

      const url =
        'https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/' +
        `ExpectativasMercadoSelic?$top=200&$filter=Data%20eq%20'${isoDate}'&$format=json`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketDashboard/1.0)' },
        cache: 'no-store',
      });

      if (!res.ok) continue;

      const json = await res.json();
      const records: SelicRecord[] = json?.value ?? [];
      if (records.length === 0) continue;

      const filtered = records.filter(
        (r) =>
          r.Mediana != null &&
          (r.numeroRespondentes == null || r.numeroRespondentes >= 5),
      );

      filtered.sort((a, b) => {
        const da = reuniaoToDate(a.Reuniao);
        const db = reuniaoToDate(b.Reuniao);
        if (!da || !db) return 0;
        return da.getTime() - db.getTime();
      });

      // For historical data, compute months from the historical date (not today),
      // so the x-axis labels represent the same COPOM meetings for easy comparison
      const refDate = new Date(isoDate);
      const curve: YieldPoint[] = [];
      for (const r of filtered) {
        const meetingDate = reuniaoToDate(r.Reuniao);
        if (!meetingDate) continue;
        const months =
          (meetingDate.getFullYear() - refDate.getFullYear()) * 12 +
          (meetingDate.getMonth() - refDate.getMonth());
        if (months < 0) continue;
        curve.push({
          maturity: monthsToMaturityKey(months),
          label: reuniaoToLabel(r.Reuniao),
          yield: Math.round(r.Mediana! * 100) / 100,
        });
      }

      if (curve.length >= 3) return { curve, date: isoDate };
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const compareDate = searchParams.get('compareDate');
  const cacheKey = `brazil:${compareDate ?? 'none'}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // 1. BCB Focus — market consensus SELIC forward curve by COPOM meeting (preferred)
    const expectativas = await fetchFromBCBExpectativas();
    const currentCurve = expectativas?.curve ?? (await fetchFromBCBSGS())?.curve ?? getFallbackCurve();
    const currentDate = expectativas?.date ?? new Date().toISOString().split('T')[0];

    let comparison: YieldPoint[] | null = null;
    let comparisonDate: string | null = null;

    if (compareDate) {
      const historical = await fetchHistoricalBCBExpectativas(compareDate);
      comparison = historical?.curve ?? null;
      comparisonDate = historical?.date ?? null;
    }

    const response = { current: currentCurve, currentDate, comparison, comparisonDate };
    cache.set(cacheKey, { data: response, timestamp: Date.now() });
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
