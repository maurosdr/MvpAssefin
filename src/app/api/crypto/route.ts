import { NextResponse } from 'next/server';
import ccxt from 'ccxt';
import { isBinanceRestrictedOrBlockedError } from '@/lib/exchange-restrictions';

const binance = new ccxt.binance({ enableRateLimit: true, timeout: 10_000 });
const coinbase = new ccxt.coinbase({ enableRateLimit: true, timeout: 10_000 });

let cache: { data: unknown; timestamp: number; provider: 'binance' | 'coinbase' } | null = null;
const CACHE_TTL = 15 * 1000;

type TickerRow = {
  symbol: string;
  base: string;
  price: number;
  coinbasePrice: number | null;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
};

type LeanTicker = {
  symbol?: string;
  last?: number;
  change?: number;
  percentage?: number;
  quoteVolume?: number;
  high?: number;
  low?: number;
};

function mapBinanceRow(t: LeanTicker, coinbasePrices: Record<string, number>): TickerRow {
  const base = t.symbol?.split('/')[0] || '';
  return {
    symbol: t.symbol || '',
    base,
    price: t.last || 0,
    coinbasePrice: coinbasePrices[base] || null,
    change24h: t.change || 0,
    changePercent24h: t.percentage || 0,
    volume24h: t.quoteVolume || 0,
    high24h: t.high || 0,
    low24h: t.low || 0,
  };
}

/** Top volume em pares /USD na Coinbase — fallback quando Binance não responde (ex.: HTTP 451). */
async function fetchTopFromCoinbase(): Promise<TickerRow[]> {
  const tickers = await coinbase.fetchTickers();
  const usdPairs = Object.values(tickers)
    .filter((t) => t.symbol?.endsWith('/USD') && !t.symbol?.includes(':'))
    .sort((a, b) => (b.quoteVolume || 0) - (a.quoteVolume || 0))
    .slice(0, 30);

  return usdPairs.map((t) => {
    const base = t.symbol?.split('/')[0] || '';
    const last = t.last || 0;
    return {
      symbol: `${base}/USDT`,
      base,
      price: last,
      coinbasePrice: last,
      change24h: t.change || 0,
      changePercent24h: t.percentage || 0,
      volume24h: t.quoteVolume || 0,
      high24h: t.high || 0,
      low24h: t.low || 0,
    };
  });
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      const res = NextResponse.json(cache.data);
      res.headers.set('X-Crypto-Provider', cache.provider);
      return res;
    }

    let result: TickerRow[];
    let provider: 'binance' | 'coinbase' = 'binance';

    try {
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
            coinbasePrices[t.symbol.split('/')[0]] = t.last;
          }
        }
      } catch {
        // comparativo opcional
      }

      result = usdtPairs.map((t) => mapBinanceRow(t, coinbasePrices));
    } catch (binanceErr: unknown) {
      const geo = isBinanceRestrictedOrBlockedError(binanceErr);
      try {
        result = await fetchTopFromCoinbase();
        provider = 'coinbase';
        if (geo) {
          console.warn('[api/crypto] Binance indisponível (451/região). Usando Coinbase.');
        }
      } catch {
        const bMsg = binanceErr instanceof Error ? binanceErr.message : String(binanceErr);
        const cMsg = 'Coinbase também falhou';
        return NextResponse.json(
          {
            error:
              'Não foi possível obter cotações. A Binance pode bloquear o IP do servidor (erro 451). Tentamos a Coinbase como alternativa sem sucesso.',
            detail: geo ? `Binance (bloqueio/região): ${bMsg}` : `Binance: ${bMsg}`,
            coinbaseNote: cMsg,
          },
          { status: 503 }
        );
      }
    }

    cache = { data: result, timestamp: Date.now(), provider };
    const res = NextResponse.json(result);
    res.headers.set('X-Crypto-Provider', provider);
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
