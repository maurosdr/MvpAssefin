'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import StocksTable from '@/components/StocksTable';
import StockChart from '@/components/StockChart';
import MacroNewsCard from '@/components/MacroNewsCard';
import { STOCKS_BY_CATEGORY } from '@/lib/stocks-data';

const PolymarketBrazilTable = lazy(() => import('@/components/PolymarketBrazilTable'));

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
}

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'politics' | 'economy' | 'crypto';
  imageUrl?: string;
}

const SECTOR_LABELS: Record<string, string> = {
  blueChips: 'Blue Chips',
  banks: 'Financeiro',
  retail: 'Varejo',
  energy: 'Energia',
  mining: 'Mineracao & Siderurgia',
  tech: 'Tecnologia',
  fiis: 'FIIs',
};

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [economyNews, setEconomyNews] = useState<NewsArticle[]>([]);
  const [politicsNews, setPoliticsNews] = useState<NewsArticle[]>([]);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const url = selectedCategory === 'all'
          ? '/api/stocks'
          : `/api/stocks?category=${selectedCategory}`;

        const res = await fetch(url, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setStocks(data);
          setLastUpdate(new Date());
        }
      } catch {
        // Error handling
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
    const interval = setInterval(fetchStocks, 60000);
    return () => clearInterval(interval);
  }, [selectedCategory]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news', { cache: 'no-store' });
        const data = await res.json();
        if (data.economy && Array.isArray(data.economy)) {
          setEconomyNews(
            data.economy.map((item: NewsArticle & { thumbnail?: string }) => ({
              ...item,
              imageUrl: item.imageUrl || item.thumbnail || undefined,
            }))
          );
        }
        if (data.politics && Array.isArray(data.politics)) {
          setPoliticsNews(
            data.politics.map((item: NewsArticle & { thumbnail?: string }) => ({
              ...item,
              imageUrl: item.imageUrl || item.thumbnail || undefined,
            }))
          );
        }
      } catch {
        // Error handling
      }
    };
    const timeout = setTimeout(fetchNews, 500);
    return () => clearTimeout(timeout);
  }, []);

  // Compute sector performance from loaded stocks
  const sectorPerformance = Object.entries(STOCKS_BY_CATEGORY)
    .map(([key, symbols]) => {
      const sectorStocks = stocks.filter((s) => symbols.includes(s.symbol));
      const avgChange =
        sectorStocks.length > 0
          ? sectorStocks.reduce((sum, s) => sum + s.changePercent, 0) / sectorStocks.length
          : 0;
      const totalVolume = sectorStocks.reduce((sum, s) => sum + s.volume, 0);
      return {
        key,
        sector: SECTOR_LABELS[key] || key,
        avgChangePercent: avgChange,
        stockCount: sectorStocks.length,
        totalVolume,
      };
    })
    .sort((a, b) => b.avgChangePercent - a.avgChangePercent);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader>
        {lastUpdate && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[var(--success-soft)] border border-[var(--success)]/20 rounded-lg">
            <span className="inline-block w-2 h-2 bg-[var(--success)] rounded-full animate-pulse" />
            <p className="text-xs font-medium text-[var(--success)]">
              Atualizado h&aacute; {Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s
            </p>
          </div>
        )}
      </AppHeader>

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8 space-y-6">
        {/* Page Title */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[var(--accent-soft)] rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                Acoes Brasileiras - B3
              </h1>
              <p className="text-[var(--text-secondary)] text-sm ml-[52px]">
                {stocks.length} acoes disponiveis &bull; Principais acoes negociadas na Bolsa de Valores do Brasil
              </p>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">Filtrar:</span>
            {['all', 'blueChips', 'banks', 'retail', 'fiis', 'energy', 'mining', 'tech'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-md'
                    : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                {cat === 'all' ? 'Todas' : cat === 'blueChips' ? 'Blue Chips' : cat === 'fiis' ? 'FIIs' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[var(--text-muted)]">Carregando dados da B3...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stocks Table + Indices */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <StocksTable data={stocks} />
              </div>
              <div className="lg:col-span-1">
                <div className="modern-card">
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[var(--border)]">
                    <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
                    <h3 className="section-title">Indices B3</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--text-muted)]">IBOVESPA</span>
                        <span className="data-value text-[var(--text-primary)] font-bold">120.450</span>
                      </div>
                      <div className="w-full h-1 bg-[var(--surface)] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[var(--success)] to-[var(--accent)]" style={{ width: '65%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--text-muted)]">IFIX</span>
                        <span className="data-value text-[var(--text-primary)] font-bold">3.245</span>
                      </div>
                      <div className="w-full h-1 bg-[var(--surface)] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[var(--info)] to-[var(--accent)]" style={{ width: '45%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--text-muted)]">SMALL11</span>
                        <span className="data-value text-[var(--text-primary)] font-bold">2.890</span>
                      </div>
                      <div className="w-full h-1 bg-[var(--surface)] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[var(--warning)] to-[var(--accent)]" style={{ width: '55%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stock Chart */}
            <div>
              <StockChart
                availableStocks={stocks.slice(0, 10).map((s) => ({
                  symbol: s.symbol,
                  name: s.name,
                }))}
              />
            </div>

            {/* Sector Performance */}
            {stocks.length > 0 && (
              <div className="modern-card">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
                  <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
                  <h3 className="section-title">Performance por Setor</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)] border-b-2 border-[var(--border)]">
                        <th className="pb-3 text-left">SETOR</th>
                        <th className="pb-3 text-right">VAR MEDIA %</th>
                        <th className="pb-3 text-right">ACOES</th>
                        <th className="pb-3 text-right">VOLUME TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {sectorPerformance.map((sector) => (
                        <tr
                          key={sector.key}
                          className="hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                          onClick={() => setSelectedCategory(sector.key)}
                        >
                          <td className="py-3 text-sm font-semibold text-[var(--text-primary)]">
                            {sector.sector}
                          </td>
                          <td
                            className={`py-3 text-right data-value font-bold ${
                              sector.avgChangePercent >= 0
                                ? 'text-[var(--success)]'
                                : 'text-[var(--danger)]'
                            }`}
                          >
                            {sector.avgChangePercent >= 0 ? '+' : ''}
                            {sector.avgChangePercent.toFixed(2)}%
                          </td>
                          <td className="py-3 text-right text-sm text-[var(--text-secondary)]">
                            {sector.stockCount}
                          </td>
                          <td className="py-3 text-right text-sm text-[var(--text-secondary)] data-value">
                            {sector.totalVolume > 1e9
                              ? `R$ ${(sector.totalVolume / 1e9).toFixed(1)}B`
                              : `R$ ${(sector.totalVolume / 1e6).toFixed(1)}M`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Economy & Politics News */}
            {(economyNews.length > 0 || politicsNews.length > 0) && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
                  <h2 className="section-title">Economia & Politica</h2>
                </div>
                <MacroNewsCard articles={[...economyNews.slice(0, 3), ...politicsNews.slice(0, 3)]} />
              </div>
            )}

            {/* Polymarket Brazil Elections */}
            <Suspense
              fallback={
                <div className="modern-card p-8 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <PolymarketBrazilTable />
            </Suspense>
          </>
        )}
      </main>
    </div>
  );
}
