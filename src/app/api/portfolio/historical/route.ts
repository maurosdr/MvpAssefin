import { NextRequest, NextResponse } from 'next/server';
import ccxt from 'ccxt';

const BRAPI_TOKEN = 'kAohDLSrNNS3JNZijP4voJ';

const binance = new ccxt.binance({ enableRateLimit: true, timeout: 10_000 });

interface HistoricalPoint {
  date: string;
  close: number;
}

async function fetchStockHistory(symbol: string, range: string): Promise<HistoricalPoint[]> {
  try {
    const url = `https://brapi.dev/api/quote/${symbol}?range=${range}&interval=1d&token=${BRAPI_TOKEN}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results = data.results?.[0];
    if (!results?.historicalDataPrice) return [];

    return results.historicalDataPrice.map((item: { date: number; close?: number }) => ({
      date: new Date(item.date * 1000).toISOString().split('T')[0],
      close: item.close || 0,
    })).filter((p: HistoricalPoint) => p.close > 0);
  } catch {
    return [];
  }
}

async function fetchCryptoHistory(symbol: string, range: string): Promise<HistoricalPoint[]> {
  try {
    const tfMap: Record<string, { tf: string; limit: number }> = {
      '1mo': { tf: '1d', limit: 30 },
      '3mo': { tf: '1d', limit: 90 },
      '6mo': { tf: '1d', limit: 180 },
      '1y': { tf: '1d', limit: 365 },
      '2y': { tf: '1d', limit: 730 },
    };

    const config = tfMap[range] || tfMap['1y'];
    const pair = symbol.includes('/') ? symbol : `${symbol}/USDT`;

    const ohlcv = await binance.fetchOHLCV(pair, config.tf, undefined, config.limit);

    return ohlcv.map((candle) => ({
      date: new Date(candle[0] as number).toISOString().split('T')[0],
      close: candle[4] as number,
    }));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols')?.split(',') || [];
  const types = searchParams.get('types')?.split(',') || [];
  const range = searchParams.get('range') || '1y';

  if (symbols.length === 0) {
    return NextResponse.json({ error: 'symbols required' }, { status: 400 });
  }

  const results: Record<string, HistoricalPoint[]> = {};

  await Promise.all(
    symbols.map(async (symbol, i) => {
      const type = types[i] || 'stock';

      if (type === 'crypto') {
        results[symbol] = await fetchCryptoHistory(symbol, range);
      } else {
        results[symbol] = await fetchStockHistory(symbol, range);
      }
    })
  );

  // Align all series to common dates
  const allDates = new Set<string>();
  for (const series of Object.values(results)) {
    for (const point of series) {
      allDates.add(point.date);
    }
  }

  const sortedDates = Array.from(allDates).sort();

  // Build aligned data
  const aligned: Record<string, (number | null)[]> = {};
  for (const [symbol, series] of Object.entries(results)) {
    const priceMap = new Map(series.map((p) => [p.date, p.close]));
    aligned[symbol] = sortedDates.map((date) => priceMap.get(date) ?? null);

    // Forward-fill nulls
    for (let i = 1; i < aligned[symbol].length; i++) {
      if (aligned[symbol][i] === null) {
        aligned[symbol][i] = aligned[symbol][i - 1];
      }
    }
  }

  return NextResponse.json({
    dates: sortedDates,
    prices: aligned,
  });
}
