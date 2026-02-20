import { NextRequest, NextResponse } from 'next/server';

// Cache simples (1 minuto para cotações, 5 minutos para dados fundamentais)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60 * 1000;
const FUNDAMENTAL_CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1mo';
  const interval = searchParams.get('interval') || '1d';
  const modules = searchParams.get('modules');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  const cacheKey = `${symbol}-${range}-${interval}-${modules || 'none'}`;
  const cached = cache.get(cacheKey);
  const ttl = modules ? FUNDAMENTAL_CACHE_TTL : CACHE_TTL;

  if (cached && Date.now() - cached.timestamp < ttl) {
    return NextResponse.json(cached.data);
  }

  try {
    // BRAPI endpoint para histórico e dados fundamentais
    let url = `https://brapi.dev/api/quote/${symbol}?range=${range}&interval=${interval}`;
    if (modules) {
      url += `&modules=${modules}`;
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Authorization': 'Bearer kAohDLSrNNS3JNZijP4voJ',
      },
      next: { revalidate: modules ? 300 : 60 },
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
      adjustedClose?: number;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedData: Record<string, any> = {
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
      fiftyTwoWeekHigh: stock.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: stock.fiftyTwoWeekLow,
      averageDailyVolume10Day: stock.averageDailyVolume10Day,
      averageDailyVolume3Month: stock.averageDailyVolume3Month,
      dividendsData: stock.dividendsData,
      logoUrl: stock.logoUrl || stock.logourl,
      data: history.map((item: HistoryItem) => ({
        date: new Date(item.date * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        fullDate: new Date(item.date * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        timestamp: item.date * 1000,
        open: item.open || 0,
        high: item.high || 0,
        low: item.low || 0,
        close: item.close || 0,
        volume: item.volume || 0,
        adjustedClose: item.adjustedClose || item.close || 0,
      })),
    };

    // Include fundamental data if modules were requested
    if (modules) {
      if (stock.summaryProfile) formattedData.summaryProfile = stock.summaryProfile;
      if (stock.financialData) formattedData.financialData = stock.financialData;
      if (stock.defaultKeyStatistics) formattedData.defaultKeyStatistics = stock.defaultKeyStatistics;
      if (stock.incomeStatementHistory) formattedData.incomeStatementHistory = stock.incomeStatementHistory;
      if (stock.balanceSheetHistory) formattedData.balanceSheetHistory = stock.balanceSheetHistory;
      if (stock.cashflowStatementHistory) formattedData.cashflowHistory = stock.cashflowStatementHistory;
      if (stock.cashflowHistory) formattedData.cashflowHistory = stock.cashflowHistory;
      if (stock.calendarEvents) formattedData.calendarEvents = stock.calendarEvents;
      if (stock.recommendationTrend) formattedData.recommendationTrend = stock.recommendationTrend;
      if (stock.majorHolders) formattedData.majorHolders = stock.majorHolders;
      if (stock.earningsHistory) formattedData.earningsHistory = stock.earningsHistory;
    }

    cache.set(cacheKey, { data: formattedData, timestamp: Date.now() });
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('BRAPI quote error:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}
