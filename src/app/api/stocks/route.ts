import { NextRequest, NextResponse } from 'next/server';
import { MAIN_STOCKS, STOCKS_BY_CATEGORY, getStockName } from '@/lib/stocks-data';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
}

// Cache simples (5 minutos)
let cache: { data: StockData[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols') || MAIN_STOCKS.join(',');
  const category = searchParams.get('category');
  
  // Se categoria especificada, usar ações da categoria
  let symbolsToFetch = symbols;
  if (category && STOCKS_BY_CATEGORY[category as keyof typeof STOCKS_BY_CATEGORY]) {
    symbolsToFetch = STOCKS_BY_CATEGORY[category as keyof typeof STOCKS_BY_CATEGORY].join(',');
  }

  // Verificar cache
  if (cache && cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  interface BRAPIStock {
    symbol: string;
    longName?: string;
    shortName?: string;
    regularMarketPrice?: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    regularMarketVolume?: number;
    marketCap?: number;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketOpen?: number;
    regularMarketPreviousClose?: number;
  }

  const transformStock = (stock: BRAPIStock): StockData => ({
    symbol: stock.symbol,
    name: stock.longName || stock.shortName || stock.symbol,
    price: stock.regularMarketPrice || 0,
    change: stock.regularMarketChange || 0,
    changePercent: stock.regularMarketChangePercent || 0,
    volume: stock.regularMarketVolume || 0,
    marketCap: stock.marketCap,
    high: stock.regularMarketDayHigh,
    low: stock.regularMarketDayLow,
    open: stock.regularMarketOpen,
    previousClose: stock.regularMarketPreviousClose,
  });

  try {
    const symbolsArray = symbolsToFetch.split(',').filter(Boolean);
    
    // Se tiver mais de 20 ações, fazer requisições em lote
    if (symbolsArray.length > 20) {
      const batches: string[][] = [];
      for (let i = 0; i < symbolsArray.length; i += 20) {
        batches.push(symbolsArray.slice(i, i + 20));
      }
      
      const allStocks: StockData[] = [];
      
      // Fazer requisições em lote (máximo 3 batches = 60 ações para não exceder rate limit)
      for (const batch of batches.slice(0, 3)) {
        try {
          const url = `https://brapi.dev/api/quote/${batch.join(',')}`;
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              'Authorization': 'Bearer kAohDLSrNNS3JNZijP4voJ',
            },
            next: { revalidate: 300 },
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.results && Array.isArray(data.results)) {
              const stocks = data.results.map(transformStock);
              allStocks.push(...stocks);
            }
          } else {
            console.warn(`BRAPI batch failed: ${res.status}`);
          }
        } catch (batchError) {
          console.error('Batch error:', batchError);
          // Continuar com próximo batch mesmo se um falhar
        }
        
        // Pequeno delay entre batches para não exceder rate limit
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      if (allStocks.length > 0) {
        allStocks.sort((a, b) => b.volume - a.volume);
        cache = { data: allStocks, timestamp: Date.now() };
        return NextResponse.json(allStocks);
      } else {
        // Se nenhum batch retornou dados, usar fallback
        console.warn('No stocks returned from batches, using fallback');
        return NextResponse.json(getFallbackStocks());
      }
    } else {
      // Código original para menos de 20 ações
      const limitedSymbols = symbolsArray.slice(0, 20).join(',');
      const url = `https://brapi.dev/api/quote/${limitedSymbols}`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Authorization': 'Bearer kAohDLSrNNS3JNZijP4voJ',
        },
        next: { revalidate: 300 },
      });

      if (!res.ok) {
        throw new Error(`BRAPI request failed: ${res.status}`);
      }

      const data = await res.json();
      
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid BRAPI response');
      }

      const stocks: StockData[] = data.results.map(transformStock);
      stocks.sort((a, b) => b.volume - a.volume);

      cache = { data: stocks, timestamp: Date.now() };
      return NextResponse.json(stocks);
    }
  } catch (error) {
    // Fallback com dados mockados
    console.error('BRAPI error:', error);
    return NextResponse.json(getFallbackStocks());
  }
}

function getFallbackStocks(): StockData[] {
  const basePrices: Record<string, number> = {
    PETR4: 32.50,
    VALE3: 68.90,
    ITUB4: 28.45,
    BBDC4: 18.20,
    ABEV3: 12.80,
    WEGE3: 45.60,
    RENT3: 58.30,
    SUZB3: 52.10,
    ELET3: 42.00,
    BBAS3: 55.00,
    RADL3: 25.80,
    CMIG4: 12.50,
    HAPV3: 6.20,
    VIVT3: 48.30,
    BRAP4: 22.40,
    KLBN11: 18.90,
    UGPA3: 24.10,
    TAEE11: 38.50,
    CCRO3: 14.20,
    CYRE3: 19.80,
    MGLU3: 8.50,
    VBBR3: 2.30,
    LREN3: 28.40,
    ARZZ3: 45.20,
    CAML3: 12.10,
    GUAR3: 15.60,
    NTCO3: 18.30,
    SOMA3: 9.80,
    SANB11: 38.20,
    BPAN4: 5.40,
    BRSR6: 9.20,
    CRFB3: 16.80,
    PINE4: 8.90,
    EQTL3: 24.60,
    CPLE6: 7.20,
    ELET6: 38.40,
    ENBR3: 22.10,
    EGIE3: 42.80,
    ENGI11: 28.50,
    GGBR4: 23.40,
    USIM5: 8.20,
    CSNA3: 18.60,
    GOAU4: 9.40,
    CSAN3: 19.20,
    HGLG11: 98.50,
    XPML11: 102.30,
    KNRI11: 95.80,
    HGRU11: 88.20,
    VISC11: 92.40,
    XPLG11: 89.60,
    BTLG11: 94.20,
    RBRF11: 96.80,
    TOTS3: 32.40,
    LWSA3: 8.90,
    CASH3: 2.10,
    STOC31: 12.40,
    PRIO3: 24.80,
    RDOR3: 28.60,
    DXCO3: 9.20,
    FESA4: 18.40,
    GMAT3: 22.80,
    ENEV3: 12.60,
    // BDRs
    ROXO34: 12.50,
    M1TA34: 85.20,
    AAPL34: 52.40,
    AMZO34: 38.90,
    GOGL34: 45.60,
    MSFT34: 78.30,
    TSLA34: 42.10,
    NVDC34: 92.80,
    NFLX34: 68.50,
    DISB34: 28.40,
  };

  // Retornar 20 ações em vez de 8
  return MAIN_STOCKS.slice(0, 20).map((symbol) => {
    const basePrice = basePrices[symbol] || 20 + Math.random() * 50;
    const changePercent = (Math.random() - 0.5) * 4; // -2% a +2%
    const change = basePrice * (changePercent / 100);
    const price = basePrice + change;

    return {
      symbol,
      name: getStockName(symbol),
      price: Number(price.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      high: Number((price * 1.02).toFixed(2)),
      low: Number((price * 0.98).toFixed(2)),
      open: Number((price * 0.99).toFixed(2)),
      previousClose: basePrice,
    };
  });
}

// getStockName is now imported from @/lib/stocks-data

