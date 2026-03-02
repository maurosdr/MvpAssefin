import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Stock NVT Signal API (adapted from crypto NVT for B3 stocks)
//
// NVT Signal = Market Cap / 90-Day MA of Daily Financial Volume
//
// For stocks, "Daily Transaction Value" = daily traded financial volume (R$).
// Advanced version adds rolling Bollinger-style std-dev bands:
//   Upper band = rolling mean(NVT) + 2 × std(NVT) → overbought zone (red)
//   Lower band = rolling mean(NVT) − 2 × std(NVT) → oversold zone  (green)
//
// Data source: BRAPI (historical daily data with volume)
// ---------------------------------------------------------------------------

// Cache: 30-minute TTL
let cache: { data: unknown; timestamp: number; key: string } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

const BRAPI_TOKEN = 'kAohDLSrNNS3JNZijP4voJ';

// ---------------------------------------------------------------------------
// Fetch daily historical data from BRAPI
// ---------------------------------------------------------------------------
async function fetchDailyHistory(symbol: string): Promise<{
  dateStr: string;
  close: number;
  volume: number;
  financialVolume: number;
}[]> {
  // Fetch max range with daily interval for NVT warm-up
  const url = `https://brapi.dev/api/quote/${symbol}?range=5y&interval=1d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Authorization: `Bearer ${BRAPI_TOKEN}`,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`BRAPI returned ${res.status}`);

  const json = await res.json();
  const stock = json?.results?.[0];
  if (!stock) throw new Error('No stock data from BRAPI');

  const history: { date: number; close?: number; volume?: number; open?: number; high?: number; low?: number }[] =
    stock.historicalDataPrice || [];

  const marketCap: number | null = stock.marketCap ?? null;

  return history
    .filter((h) => h.close && h.close > 0 && h.volume && h.volume > 0)
    .map((h) => {
      const close = h.close!;
      const volume = h.volume!;
      // Financial volume approximation: close * volume (shares traded × price)
      const financialVolume = close * volume;
      return {
        dateStr: new Date(h.date * 1000).toISOString().split('T')[0],
        close,
        volume,
        financialVolume,
      };
    })
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

// ---------------------------------------------------------------------------
// Rolling helpers
// ---------------------------------------------------------------------------
function rollingMean(arr: number[], window: number, i: number): number | null {
  if (i < window - 1) return null;
  const slice = arr.slice(i - window + 1, i + 1);
  return slice.reduce((s, v) => s + v, 0) / window;
}

function rollingStd(arr: number[], window: number, i: number): number | null {
  if (i < window - 1) return null;
  const slice = arr.slice(i - window + 1, i + 1);
  const mean = slice.reduce((s, v) => s + v, 0) / window;
  const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / window;
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'PETR4';

  const cacheKey = `stock-nvt:${symbol}`;
  if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const history = await fetchDailyHistory(symbol);

    if (history.length < 120) {
      return NextResponse.json({ error: 'Insufficient data for NVT calculation' }, { status: 404 });
    }

    // Fetch current market cap from BRAPI
    const quoteRes = await fetch(
      `https://brapi.dev/api/quote/${symbol}?modules=defaultKeyStatistics`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Authorization: `Bearer ${BRAPI_TOKEN}`,
        },
        signal: AbortSignal.timeout(10_000),
      }
    );
    const quoteJson = await quoteRes.json();
    const currentMarketCap: number | null = quoteJson?.results?.[0]?.marketCap ?? null;

    // Estimate shares outstanding from current market cap and last price
    const lastClose = history[history.length - 1].close;
    const sharesOutstanding =
      currentMarketCap && lastClose > 0 ? currentMarketCap / lastClose : null;

    // Build NVT Signal
    const TX_MA_WINDOW = 90;
    const BAND_WINDOW = 90;

    const finVolArr = history.map((d) => d.financialVolume);

    // NVT = Market Cap / 90-DMA of Financial Volume
    // Market Cap for each day ≈ close × sharesOutstanding (estimated from current data)
    const nvtArr: (number | null)[] = history.map((_, i) => {
      const txMA = rollingMean(finVolArr, TX_MA_WINDOW, i);
      if (txMA === null || txMA <= 0) return null;

      // Estimate market cap for this day
      const dayMarketCap = sharesOutstanding
        ? history[i].close * sharesOutstanding
        : history[i].close * history[i].volume * 100; // rough fallback
      return dayMarketCap / txMA;
    });

    // Rolling std-dev bands on NVT series
    const nvtNonNull = nvtArr.map((v) => v ?? 0);

    const output: {
      date: string;
      price: number;
      nvt: number;
      nvtMean: number;
      upper: number;
      lower: number;
      zone: 'overbought' | 'oversold' | 'neutral';
    }[] = [];

    for (let i = 0; i < history.length; i++) {
      const nvt = nvtArr[i];
      if (nvt === null) continue;

      const mean = rollingMean(nvtNonNull, BAND_WINDOW, i);
      const std = rollingStd(nvtNonNull, BAND_WINDOW, i);
      if (mean === null || std === null) continue;

      const upper = mean + 2 * std;
      const lower = Math.max(0, mean - 2 * std);

      const zone: 'overbought' | 'oversold' | 'neutral' =
        nvt > upper ? 'overbought' : nvt < lower ? 'oversold' : 'neutral';

      output.push({
        date: history[i].dateStr,
        price: Math.round(history[i].close * 100) / 100,
        nvt: Math.round(nvt * 100) / 100,
        nvtMean: Math.round(mean * 100) / 100,
        upper: Math.round(upper * 100) / 100,
        lower: Math.round(lower * 100) / 100,
        zone,
      });
    }

    if (output.length === 0) {
      return NextResponse.json({ error: 'Could not compute NVT Signal' }, { status: 500 });
    }

    // Keep last 2 years for chart display
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 2);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const displayData = output.filter((d) => d.date >= cutoffStr);

    const result = {
      data: displayData,
      latestNVT: displayData[displayData.length - 1]?.nvt ?? null,
      latestUpper: displayData[displayData.length - 1]?.upper ?? null,
      latestLower: displayData[displayData.length - 1]?.lower ?? null,
      latestZone: displayData[displayData.length - 1]?.zone ?? 'neutral',
    };

    cache = { data: result, timestamp: Date.now(), key: cacheKey };
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
