'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import StocksTable from '@/components/StocksTable';
import StockChart from '@/components/StockChart';
import { STOCKS_BY_CATEGORY } from '@/lib/stocks-data';

const PolymarketBrazilTable = lazy(() => import('@/components/PolymarketBrazilTable'));
const ExchangeFlowChart = lazy(() => import('@/components/ExchangeFlowChart'));

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

const SECTOR_LABELS: Record<string, string> = {
  blueChips: 'Blue Chips',
  banks: 'Financeiro',
  retail: 'Varejo',
  energy: 'Energia',
  mining: 'Mineracao & Siderurgia',
  tech: 'Tecnologia',
  fiis: 'FIIs',
  bdrs: 'BDRs',
};

const MAIN_ETFS = [
  { symbol: 'BOVA11', name: 'iShares Ibovespa' },
  { symbol: 'IVVB11', name: 'iShares S&P 500' },
  { symbol: 'HASH11', name: 'Hashdex Nasdaq Crypto Index' },
  { symbol: 'SMAL11', name: 'iShares Small Cap' },
  { symbol: 'LFTS11', name: 'Investo Teva Tesouro Selic' },
  { symbol: 'IMAB11', name: 'It Now IMAB' },
  { symbol: 'DIVO11', name: 'It Now IDIV' },
  { symbol: 'B5P211', name: 'It Now IMA-B 5+' },
  { symbol: 'GOLD11', name: 'It Now Gold' },
  { symbol: 'NASD11', name: 'Trend Nasdaq 100' },
];

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [etfData, setEtfData] = useState<Array<{
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
  }>>([]);

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
    const fetchETFs = async () => {
      try {
        const results = await Promise.all(
          MAIN_ETFS.map(async (etf) => {
            const res = await fetch(`/api/stocks/quote?symbol=${etf.symbol}&range=1d&interval=1d`, {
              cache: 'no-store',
            });
            const data = await res.json();
            return {
              symbol: etf.symbol,
              name: etf.name,
              price: data.currentPrice || 0,
              changePercent: data.changePercent || 0,
            };
          })
        );
        setEtfData(results.filter((r) => r.price > 0));
      } catch {
        // Error handling
      }
    };
    fetchETFs();
    const interval = setInterval(fetchETFs, 60000);
    return () => clearInterval(interval);
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
        symbols: sectorStocks.map((s) => s.symbol),
        allSymbols: symbols,
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
            {['all', 'blueChips', 'banks', 'retail', 'fiis', 'energy', 'mining', 'tech', 'bdrs'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-md'
                    : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                {cat === 'all' ? 'Todas' : cat === 'blueChips' ? 'Blue Chips' : cat === 'fiis' ? 'FIIs' : cat === 'bdrs' ? 'BDRs' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ETFs Card - Top */}
        {etfData.length > 0 && (
          <div className="modern-card">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[var(--border)]">
              <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
              <h3 className="section-title">ETFs Brasileiros</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {etfData.map((etf) => (
                <div key={etf.symbol} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 hover:border-[var(--accent)]/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[var(--text-primary)] font-mono">{etf.symbol}</span>
                    <span
                      className={`data-value text-[10px] font-semibold ${
                        etf.changePercent >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                      }`}
                    >
                      {etf.changePercent >= 0 ? '+' : ''}{etf.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mb-1 truncate">{etf.name}</div>
                  <div className="data-value text-sm font-bold text-[var(--text-primary)]">
                    {etf.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

            {/* Exchange Flow - BCB */}
            <Suspense
              fallback={
                <div className="modern-card p-8 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <ExchangeFlowChart />
            </Suspense>

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
                        <th className="pb-3 text-left">TICKERS</th>
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
                          <td className="py-3 text-xs text-[var(--text-secondary)]">
                            <div className="flex flex-wrap gap-1 max-w-[400px]">
                              {sector.allSymbols.map((sym) => (
                                <span
                                  key={sym}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                    sector.symbols.includes(sym)
                                      ? 'bg-[var(--accent-soft)] border border-[var(--accent)]/30 text-[var(--accent)]'
                                      : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]'
                                  }`}
                                >
                                  {sym}
                                </span>
                              ))}
                            </div>
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
