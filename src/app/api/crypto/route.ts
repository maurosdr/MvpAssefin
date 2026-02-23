import { NextResponse } from 'next/server';
import ccxt from 'ccxt';

// Clients configurados com timeout explícito para evitar requisições presas
const binance = new ccxt.binance({ enableRateLimit: true, timeout: 10_000 });
const coinbase = new ccxt.coinbase({ enableRateLimit: true, timeout: 10_000 });

// Cache simples em memória para acelerar chamadas repetidas
// Mantém os dados por alguns segundos, o suficiente para navegação fluida
let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 15 * 1000; // 15 segundos

export async function GET() {
  try {
    // Retornar do cache se os dados ainda estiverem "frescos"
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data);
    }

    const tickers = await binance.fetchTickers();

    const usdtPairs = Object.values(tickers)
      .filter((t) => t.symbol?.endsWith('/USDT') && !t.symbol?.includes(':'))
      .sort((a, b) => (b.quoteVolume || 0) - (a.quoteVolume || 0))
      .slice(0, 30);

    const coinbasePrices: Record<string, number> = {};
    try {
      const cbTickers = await coinbase.fetchTickers();
      for (const t of Object.values(cbTickers)) {
        if (t.symbol && t.last) {
          const base = t.symbol.split('/')[0];
          coinbasePrices[base] = t.last;
        }
      }
    } catch {
      // Coinbase pode falhar ou estar lenta; continuamos apenas com Binance
    }

    const result = usdtPairs.map((t) => {
      const base = t.symbol?.split('/')[0] || '';
      return {
        symbol: t.symbol,
        base,
        price: t.last || 0,
        coinbasePrice: coinbasePrices[base] || null,
        change24h: t.change || 0,
        changePercent24h: t.percentage || 0,
        volume24h: t.quoteVolume || 0,
        high24h: t.high || 0,
        low24h: t.low || 0,
      };
    });

    cache = { data: result, timestamp: Date.now() };

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
