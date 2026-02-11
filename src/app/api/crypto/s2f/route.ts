import { NextRequest, NextResponse } from 'next/server';
import ccxt from 'ccxt';

const binance = new ccxt.binance({ enableRateLimit: true });
const exchanges: Record<string, typeof binance> = {
  binance,
};

// Cache with 30-minute TTL
let cache: { data: unknown; timestamp: number; key: string } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

// Bitcoin halving schedule
const HALVINGS = [
  { date: new Date('2009-01-03T00:00:00Z'), blockReward: 50, blocksStart: 0 },
  { date: new Date('2012-11-28T00:00:00Z'), blockReward: 25, blocksStart: 210000 },
  { date: new Date('2016-07-09T00:00:00Z'), blockReward: 12.5, blocksStart: 420000 },
  { date: new Date('2020-05-11T00:00:00Z'), blockReward: 6.25, blocksStart: 630000 },
  { date: new Date('2024-04-20T00:00:00Z'), blockReward: 3.125, blocksStart: 840000 },
];

const BLOCKS_PER_DAY = 144;
const BLOCKS_PER_YEAR = BLOCKS_PER_DAY * 365.25;
function getSupplyAndFlowAtDate(date: Date): { stock: number; annualFlow: number; s2f: number } {
  let stock = 0;
  let currentReward = 50;

  for (let i = 0; i < HALVINGS.length; i++) {
    const eraStart = HALVINGS[i].date;
    const eraEnd = i + 1 < HALVINGS.length ? HALVINGS[i + 1].date : new Date('2100-01-01T00:00:00Z');

    if (date < eraStart) break;

    const end = date < eraEnd ? date : eraEnd;
    const days = (end.getTime() - eraStart.getTime()) / (1000 * 60 * 60 * 24);
    const blocks = Math.max(0, days) * BLOCKS_PER_DAY;
    stock += blocks * HALVINGS[i].blockReward;
    currentReward = HALVINGS[i].blockReward;

    if (date < eraEnd) break;
  }

  const annualFlow = BLOCKS_PER_YEAR * currentReward;
  const s2f = annualFlow > 0 ? stock / annualFlow : 0;

  return { stock, annualFlow, s2f };
}

function getS2FModelPrice(s2f: number, stock: number): number {
  if (s2f <= 0 || stock <= 0) return 0;
  // PlanB's S2F model: ln(market_cap) = 3.32 * ln(S2F) + 14.6
  const lnMarketCap = 3.32 * Math.log(s2f) + 14.6;
  const marketCap = Math.exp(lnMarketCap);
  return marketCap / stock;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTC/USDT';
  const exchangeName = searchParams.get('exchange') || 'binance';

  const cacheKey = `${exchangeName}:${symbol}:s2f`;
  if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const exchange = exchanges[exchangeName] || exchanges.binance;

  try {
    // Window: ~1 year before 3rd halving (2019-05-01) to now
    const startDate = new Date('2019-05-01T00:00:00Z');
    const now = Date.now();
    const allCandles: Array<{ timestamp: number; close: number }> = [];

    // Paginate daily candles (max 1000 per request)
    let since = startDate.getTime();
    while (since < now) {
      const ohlcv = await exchange.fetchOHLCV(symbol, '1d', since, 1000);
      if (!ohlcv || ohlcv.length === 0) break;

      for (const candle of ohlcv) {
        allCandles.push({
          timestamp: candle[0] as number,
          close: candle[4] as number,
        });
      }

      // Move to after the last candle
      const lastTs = ohlcv[ohlcv.length - 1][0] as number;
      if (lastTs <= since) break; // prevent infinite loop
      since = lastTs + 24 * 60 * 60 * 1000; // next day
    }

    if (allCandles.length === 0) {
      return NextResponse.json({ error: 'No data available' }, { status: 404 });
    }

    // Build S2F data points
    const data: Array<{
      date: string;
      actualPrice: number;
      s2fPrice: number;
      s2fRatio: number;
      stock: number;
    }> = [];

    for (const candle of allCandles) {
      const date = new Date(candle.timestamp);
      const { stock, s2f } = getSupplyAndFlowAtDate(date);
      const s2fPrice = getS2FModelPrice(s2f, stock);

      data.push({
        date: date.toISOString().split('T')[0],
        actualPrice: candle.close,
        s2fPrice: Math.round(s2fPrice * 100) / 100,
        s2fRatio: Math.round(s2f * 100) / 100,
        stock: Math.round(stock),
      });
    }

    // Include halving dates for reference lines
    const halvingDates = HALVINGS.filter(
      (h) => h.date >= startDate && h.date.getTime() <= now
    ).map((h) => ({
      date: h.date.toISOString().split('T')[0],
      blockReward: h.blockReward,
      label:
        h.blockReward === 6.25
          ? 'Halving 3'
          : h.blockReward === 3.125
            ? 'Halving 4'
            : `Halving`,
    }));

    const result = { data, halvingDates };
    cache = { data: result, timestamp: Date.now(), key: cacheKey };
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
