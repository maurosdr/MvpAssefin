'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import { getStockLogoUrl, getStockInitials } from '@/lib/stock-logos';
import { STOCK_NAMES } from '@/lib/stocks-data';
import StockTradeIdeas from '@/components/StockTradeIdeas';

interface ETFDetail {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  logoUrl?: string;
}

function formatBRL(v: number | undefined | null): string {
  if (v == null || isNaN(v)) return '-';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatLargeNumber(v: number | undefined | null, prefix = 'R$ '): string {
  if (v == null || isNaN(v)) return '-';
  if (Math.abs(v) >= 1e12) return `${prefix}${(v / 1e12).toFixed(2)}T`;
  if (Math.abs(v) >= 1e9) return `${prefix}${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `${prefix}${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `${prefix}${(v / 1e3).toFixed(0)}K`;
  return `${prefix}${v.toLocaleString('pt-BR')}`;
}

export default function ETFDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params.symbol as string;
  const [etf, setEtf] = useState<ETFDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const fetchETF = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/stocks/quote?symbol=${symbol}&range=1mo&interval=1d`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (data.symbol || data.name) {
          setEtf({
            symbol: data.symbol || symbol,
            name: data.name || STOCK_NAMES[symbol] || symbol,
            currentPrice: data.currentPrice || 0,
            change: data.change || 0,
            changePercent: data.changePercent || 0,
            volume: data.volume,
            marketCap: data.marketCap,
            high: data.high,
            low: data.low,
            open: data.open,
            previousClose: data.previousClose,
            fiftyTwoWeekHigh: data.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: data.fiftyTwoWeekLow,
            logoUrl: data.logoUrl,
          });
        }
      } catch {
        setEtf(null);
      } finally {
        setLoading(false);
      }
    };
    if (symbol) fetchETF();
  }, [symbol]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <MarketTickerBar />
        <AppHeader />
        <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[var(--text-muted)]">Carregando dados de {symbol}...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!etf) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <MarketTickerBar />
        <AppHeader />
        <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-[var(--text-muted)] mb-4">ETF nao encontrado</p>
              <button
                onClick={() => router.push('/stocks')}
                className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg font-semibold hover:bg-[var(--accent-hover)] transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isPositive = etf.changePercent >= 0;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-16 h-16 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center overflow-hidden shadow-sm">
              {(etf.logoUrl || getStockLogoUrl(symbol)) && !logoError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={etf.logoUrl || getStockLogoUrl(symbol)}
                  alt={etf.name}
                  className="w-full h-full object-contain p-2"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-primary)] font-bold text-lg">
                  {getStockInitials(symbol)}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">{etf.name}</h1>
              <p className="text-[var(--text-muted)]">
                {etf.symbol} &bull; ETF &bull; B3
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="data-value text-3xl font-bold text-[var(--text-primary)] mb-1">
              {etf.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className={`data-value text-xl font-semibold ${isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {isPositive ? '+' : ''}{etf.changePercent.toFixed(2)}% ({isPositive ? '+' : ''}
              {etf.change.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Volume</p>
            <p className="text-lg font-bold font-mono text-[var(--text-primary)]">{formatLargeNumber(etf.volume)}</p>
          </div>
          <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Abertura</p>
            <p className="text-lg font-bold font-mono text-[var(--text-primary)]">{formatBRL(etf.open)}</p>
          </div>
          <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Maxima</p>
            <p className="text-lg font-bold font-mono text-[var(--success)]">{formatBRL(etf.high)}</p>
          </div>
          <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Minima</p>
            <p className="text-lg font-bold font-mono text-[var(--danger)]">{formatBRL(etf.low)}</p>
          </div>
          <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">52 Sem. Min</p>
            <p className="text-lg font-bold font-mono text-[var(--danger)]">{formatBRL(etf.fiftyTwoWeekLow)}</p>
          </div>
          <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">52 Sem. Max</p>
            <p className="text-lg font-bold font-mono text-[var(--success)]">{formatBRL(etf.fiftyTwoWeekHigh)}</p>
          </div>
        </div>

        {/* Trade Idea Section */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Trade Idea</h2>
          </div>
          <StockTradeIdeas symbol={symbol} currentPrice={etf.currentPrice} />
        </div>
      </main>
    </div>
  );
}
