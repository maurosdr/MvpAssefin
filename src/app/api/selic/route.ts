import { NextResponse } from 'next/server';

// Cache: 1 hour TTL (SELIC changes infrequently)
let cache: { rate: number; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json({ rate: cache.rate });
  }

  try {
    // BCB API - Series 432: SELIC target rate (% p.a.)
    const res = await fetch(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json',
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AsseFinDashboard/1.0)' },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok) throw new Error(`BCB API returned ${res.status}`);

    const data = await res.json();
    // Response format: [{"data":"dd/mm/yyyy","valor":"14.25"}]
    const rate = parseFloat(data?.[0]?.valor);

    if (isNaN(rate)) throw new Error('Invalid SELIC value');

    cache = { rate, timestamp: Date.now() };
    return NextResponse.json({ rate });
  } catch (error) {
    // Fallback to a reasonable default if BCB API is unreachable
    const fallbackRate = cache?.rate ?? 14.25;
    return NextResponse.json({ rate: fallbackRate, fallback: true });
  }
}
