import { NextRequest, NextResponse } from 'next/server';

// Cache simples (1 minuto para cotações individuais)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1mo';
  const interval = searchParams.get('interval') || '1d';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  const cacheKey = `${symbol}-${range}-${interval}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // BRAPI endpoint para histórico
    const url = `https://brapi.dev/api/quote/${symbol}?range=${range}&interval=${interval}&token=${process.env.BRAPI_TOKEN || ''}`;
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error('BRAPI request failed');
    }

    const data = await res.json();
    
    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
      throw new Error('Invalid BRAPI response');
    }

    const stock = data.results[0];
    
    // Extrair histórico de preços
    const history = stock.historicalDataPrice || [];
    
      interface HistoryItem {
        date: number;
        open?: number;
        high?: number;
        low?: number;
        close?: number;
        volume?: number;
      }

    const formattedData = {
      symbol: stock.symbol,
      name: stock.longName || stock.shortName || stock.symbol,
      currentPrice: stock.regularMarketPrice || 0,
      change: stock.regularMarketChange || 0,
      changePercent: stock.regularMarketChangePercent || 0,
      volume: stock.regularMarketVolume || 0,
      marketCap: stock.marketCap,
      high: stock.regularMarketDayHigh,
      low: stock.regularMarketDayLow,
      open: stock.regularMarketOpen,
      previousClose: stock.regularMarketPreviousClose,
      data: history.map((item: HistoryItem) => ({
        date: new Date(item.date * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        timestamp: item.date * 1000,
        open: item.open || 0,
        high: item.high || 0,
        low: item.low || 0,
        close: item.close || 0,
        volume: item.volume || 0,
      })),
    };

    cache.set(cacheKey, { data: formattedData, timestamp: Date.now() });
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('BRAPI quote error:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}

