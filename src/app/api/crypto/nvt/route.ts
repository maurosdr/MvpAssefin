import { NextRequest, NextResponse } from 'next/server';
import ccxt from 'ccxt';

// ---------------------------------------------------------------------------
// Advanced NVT Signal API
//
// NVT Signal = Network Value (Market Cap) / 90-Day MA of On-Chain TX Volume
//
// Advanced version adds rolling Bollinger-style std-dev bands:
//   Upper band = rolling mean(NVT) + 2 × std(NVT)  → overbought zone (red)
//   Lower band = rolling mean(NVT) − 2 × std(NVT)  → oversold zone  (green)
//
// Data sources:
//   Price + supply  → Binance via CCXT (daily candles)
//   On-chain TX vol → Blockchain.com public API (no key needed)
// ---------------------------------------------------------------------------

const binance = new ccxt.binance({ enableRateLimit: true });

// Cache: 30-minute TTL (on-chain data updates slowly)
let cache: { data: unknown; timestamp: number; key: string } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

// Bitcoin halving schedule (deterministic supply calculator)
const HALVINGS = [
  { date: new Date('2009-01-03T00:00:00Z'), blockReward: 50 },
  { date: new Date('2012-11-28T00:00:00Z'), blockReward: 25 },
  { date: new Date('2016-07-09T00:00:00Z'), blockReward: 12.5 },
  { date: new Date('2020-05-11T00:00:00Z'), blockReward: 6.25 },
  { date: new Date('2024-04-20T00:00:00Z'), blockReward: 3.125 },
];

const BLOCKS_PER_DAY = 144;

function getBitcoinSupply(date: Date): number {
  let supply = 0;
  for (let i = 0; i < HALVINGS.length; i++) {
    const eraStart = HALVINGS[i].date;
    const eraEnd = i + 1 < HALVINGS.length ? HALVINGS[i + 1].date : new Date('2140-01-01T00:00:00Z');
    if (date < eraStart) break;
    const end = date < eraEnd ? date : eraEnd;
    const days = Math.max(0, (end.getTime() - eraStart.getTime()) / 86_400_000);
    supply += days * BLOCKS_PER_DAY * HALVINGS[i].blockReward;
    if (date < eraEnd) break;
  }
  return supply;
}

// ---------------------------------------------------------------------------
// Fetch daily on-chain transaction volume from Blockchain.com (USD)
// Returns sorted array of { dateStr: string; txVol: number }
// ---------------------------------------------------------------------------
async function fetchBlockchainTxVolume(): Promise<{ dateStr: string; txVol: number }[]> {
  const url =
    'https://api.blockchain.info/charts/estimated-transaction-volume-usd' +
    '?timespan=5years&format=json&sampled=false';

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AsseFinDashboard/1.0)' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`Blockchain.com returned ${res.status}`);

  const json = await res.json();
  const values: { x: number; y: number }[] = json?.values ?? [];

  return values
    .filter((v) => v.y > 0)
    .map((v) => ({
      dateStr: new Date(v.x * 1000).toISOString().split('T')[0],
      txVol: v.y,
    }))
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

// ---------------------------------------------------------------------------
// Fetch CCXT daily prices for BTC
// ---------------------------------------------------------------------------
async function fetchDailyPrices(
  symbol: string,
  since: number
): Promise<{ dateStr: string; close: number }[]> {
  const result: { dateStr: string; close: number }[] = [];
  let cursor = since;
  const now = Date.now();

  while (cursor < now) {
    const ohlcv = await binance.fetchOHLCV(symbol, '1d', cursor, 1000);
    if (!ohlcv || ohlcv.length === 0) break;
    for (const c of ohlcv) {
      result.push({
        dateStr: new Date(c[0] as number).toISOString().split('T')[0],
        close: c[4] as number,
      });
    }
    const lastTs = ohlcv[ohlcv.length - 1][0] as number;
    if (lastTs <= cursor) break;
    cursor = lastTs + 86_400_000;
  }

  return result;
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
  const symbol = searchParams.get('symbol') || 'BTC/USDT';

  const cacheKey = `nvt:${symbol}`;
  if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // We want ~3 years of data (need 90-day warm-up + analysis window)
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 3);
    const since = startDate.getTime();

    // Fetch in parallel
    const [txVolData, priceData] = await Promise.all([
      fetchBlockchainTxVolume(),
      fetchDailyPrices(symbol, since),
    ]);

    // Build lookup maps
    const txVolMap = new Map(txVolData.map((d) => [d.dateStr, d.txVol]));
    const priceMap = new Map(priceData.map((d) => [d.dateStr, d.close]));

    // Merge on dates where both sources have data
    const dates = Array.from(
      new Set([...txVolMap.keys(), ...priceMap.keys()])
    ).sort();

    // Forward-fill missing values
    let lastTxVol = 0;
    let lastPrice = 0;

    const merged: { dateStr: string; price: number; txVol: number; marketCap: number }[] = [];

    for (const dateStr of dates) {
      const price = priceMap.get(dateStr) ?? lastPrice;
      const txVol = txVolMap.get(dateStr) ?? lastTxVol;
      if (price <= 0 || txVol <= 0) continue;
      lastPrice = price;
      lastTxVol = txVol;

      const supply = getBitcoinSupply(new Date(dateStr));
      const marketCap = price * supply;

      merged.push({ dateStr, price, txVol, marketCap });
    }

    if (merged.length < 100) {
      return NextResponse.json({ error: 'Insufficient data' }, { status: 404 });
    }

    // Build NVT Signal using 90-day MA of TX volume
    const TX_MA_WINDOW = 90;
    const BAND_WINDOW = 90; // rolling window for std-dev bands

    const txVolArr = merged.map((d) => d.txVol);
    const nvtArr: (number | null)[] = merged.map((_, i) => {
      const txMA = rollingMean(txVolArr, TX_MA_WINDOW, i);
      if (txMA === null || txMA <= 0) return null;
      return merged[i].marketCap / txMA;
    });

    // Rolling std-dev bands on the NVT series
    const nvtNonNull = nvtArr.map((v) => v ?? 0); // for window calcs (null → 0 until warm-up)

    const output: {
      date: string;
      price: number;
      nvt: number;
      nvtMean: number;
      upper: number;
      lower: number;
      zone: 'overbought' | 'oversold' | 'neutral';
    }[] = [];

    for (let i = 0; i < merged.length; i++) {
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
        date: merged[i].dateStr,
        price: Math.round(merged[i].price * 100) / 100,
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

    // Keep last 2 years for chart display (after warm-up)
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
