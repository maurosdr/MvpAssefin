'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TradingViewChart from '@/components/TradingViewChart';
import CryptoInfoPanel from '@/components/CryptoInfoPanel';
import TradeIdeas from '@/components/TradeIdeas';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import StopLossTrackingCard from '@/components/StopLossTrackingCard';
import { useExchange } from '@/context/ExchangeContext';
// BinanceLoginModal is now managed by AppHeader
import { getCryptoName } from '@/lib/crypto-names';
import { calculateRSI, calculateSMA, calculateVolatility } from '@/lib/indicators';
import { OHLCV } from '@/types/crypto';

type TopTab = 'market' | 'trade-ideas';
type ActiveTab = 'chart' | 'info';

interface CryptoStats {
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  ma20: number;
  volatility30d: number;
  rsi14: number;
}

export default function CryptoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string)?.toUpperCase() || 'BTC';
  const { connectedExchanges, book, refreshAllPortfolios } = useExchange();
  const connected = connectedExchanges.length > 0;
  const [stats, setStats] = useState<CryptoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [topTab, setTopTab] = useState<TopTab>('market');
  const [activeTab, setActiveTab] = useState<ActiveTab>('chart');

  const fetchStats = useCallback(async () => {
    try {
      const [tickerRes, ohlcvRes] = await Promise.all([
        fetch('/api/crypto'),
        fetch(`/api/crypto/ohlcv?symbol=${symbol}/USDT&window=3m`),
      ]);

      const tickers = await tickerRes.json();
      const ohlcv: OHLCV[] = await ohlcvRes.json();

      const ticker = Array.isArray(tickers)
        ? tickers.find((t: { base: string }) => t.base === symbol)
        : null;

      if (!ticker) {
        setStats(null);
        setLoading(false);
        return;
      }

      const closes = Array.isArray(ohlcv) ? ohlcv.map((c) => c.close) : [];
      const rsiValues = calculateRSI(closes, 14);
      const ma20Values = calculateSMA(closes, 20);

      const lastRsi = rsiValues.filter((v): v is number => v !== null).pop() || 0;
      const lastMa20 = ma20Values.filter((v): v is number => v !== null).pop() || 0;
      const vol30d = calculateVolatility(closes, 30);

      setStats({
        price: ticker.price,
        change24h: ticker.change24h || 0,
        changePercent24h: ticker.changePercent24h || 0,
        volume24h: ticker.volume24h,
        high24h: ticker.high24h,
        low24h: ticker.low24h,
        ma20: lastMa20,
        volatility30d: vol30d,
        rsi14: lastRsi,
      });
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  useEffect(() => {
    if (connected) {
      refreshAllPortfolios();
    }
  }, [connected, refreshAllPortfolios]);

  const bookEntry = book.find((e) => e.asset === symbol);

  const formatPrice = (p: number) => {
    if (p >= 1) return '$' + p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return '$' + p.toFixed(6);
  };

  const formatVolume = (v: number) => {
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const getRsiColor = (rsi: number) => {
    if (rsi >= 70) return 'text-red-400';
    if (rsi <= 30) return 'text-green-400';
    return 'text-[var(--accent)]';
  };

  const getRsiLabel = (rsi: number) => {
    if (rsi >= 70) return 'Overbought';
    if (rsi <= 30) return 'Oversold';
    return 'Neutral';
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/crypto')}
            className="text-gray-400 hover:text-[var(--text)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-[var(--text)]">
              {getCryptoName(symbol)} <span className="text-[var(--text-muted)] font-normal text-sm">({symbol})</span>
            </h1>
            {stats && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-bold text-[var(--text)]">{formatPrice(stats.price)}</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    stats.changePercent24h >= 0
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {stats.changePercent24h >= 0 ? '+' : ''}
                  {stats.changePercent24h.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </AppHeader>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-6 space-y-6">
        {/* Top Tab Bar: Market / Trade Ideas */}
        <div className="flex items-center gap-2 bg-[var(--surface)]/60 border border-[var(--border)] rounded-2xl p-1.5 overflow-x-auto sticky top-[120px] z-30 backdrop-blur-sm">
          <button
            onClick={() => setTopTab('market')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
              topTab === 'market'
                ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                : 'text-gray-400 hover:text-[var(--text)] hover:bg-gray-800/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Market
          </button>
          <button
            onClick={() => setTopTab('trade-ideas')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
              topTab === 'trade-ideas'
                ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                : 'text-gray-400 hover:text-[var(--text)] hover:bg-gray-800/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Trade Ideas
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ─── MARKET TAB ─── */}
            {topTab === 'market' && (
              <div className="space-y-8">
                {/* Stats Cards */}
                {stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard label="Live Price" value={formatPrice(stats.price)} />
                    <StatCard label="24h Volume" value={formatVolume(stats.volume24h)} />
                    <StatCard label="MA (20)" value={formatPrice(stats.ma20)} />
                    <StatCard
                      label="Volatility (30d)"
                      value={`${stats.volatility30d.toFixed(1)}%`}
                      valueClass={stats.volatility30d > 80 ? 'text-red-400' : stats.volatility30d > 40 ? 'text-[var(--accent)]' : 'text-green-400'}
                    />
                    <StatCard
                      label="RSI (14)"
                      value={stats.rsi14.toFixed(1)}
                      subLabel={getRsiLabel(stats.rsi14)}
                      valueClass={getRsiColor(stats.rsi14)}
                    />
                    <StatCard
                      label="MVRV"
                      value="—"
                      subLabel="On-chain data"
                      valueClass="text-[var(--text-muted)]"
                    />
                  </div>
                )}

                {/* 24h Range */}
                {stats && (
                  <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-6">
                    <h3 className="text-sm text-gray-400 mb-3">24h Range</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-red-400 font-mono">{formatPrice(stats.low24h)}</span>
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                          style={{
                            width: stats.high24h !== stats.low24h
                              ? `${((stats.price - stats.low24h) / (stats.high24h - stats.low24h)) * 100}%`
                              : '50%',
                          }}
                        />
                      </div>
                      <span className="text-sm text-green-400 font-mono">{formatPrice(stats.high24h)}</span>
                    </div>
                  </div>
                )}

                {/* Tab Toggle: Chart / Information */}
                <div className="flex items-center gap-2 bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-2">
                  <button
                    onClick={() => setActiveTab('chart')}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all ${
                      activeTab === 'chart'
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                        : 'text-gray-400 hover:text-[var(--text)] hover:bg-gray-800/50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    TradingView Chart
                  </button>
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all ${
                      activeTab === 'info'
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                        : 'text-gray-400 hover:text-[var(--text)] hover:bg-gray-800/50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Information & Flow
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'chart' ? (
                  <TradingViewChart symbol={symbol} />
                ) : (
                  <CryptoInfoPanel symbol={symbol} stats={stats} />
                )}

                {/* Stop Loss Tracking */}
                <StopLossTrackingCard symbol={symbol} currentPrice={stats?.price} />

                {/* Multi-exchange Position */}
                {connected && bookEntry && (
                  <div className="bg-[var(--surface)]/50 border border-[var(--accent)]/30 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Your {symbol} Position
                    </h2>
                    {/* Consolidated totals */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-400">Total Amount</p>
                        <p className="text-[var(--text)] font-mono text-lg">{bookEntry.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">USD Value</p>
                        <p className="text-[var(--accent)] font-mono text-lg font-bold">
                          ${bookEntry.totalUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Exchanges</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {bookEntry.exchanges.map((ex) => (
                            <span
                              key={ex.exchange}
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                                ex.exchange === 'binance'
                                  ? 'bg-yellow-500/20 text-[var(--accent)] border-[var(--accent)]/30'
                                  : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              }`}
                            >
                              {ex.exchange.charAt(0).toUpperCase() + ex.exchange.slice(1)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Per-exchange breakdown */}
                    {bookEntry.exchanges.length > 1 && (
                      <div className="border-t border-[var(--border)] pt-3 space-y-2">
                        {bookEntry.exchanges.map((ex) => (
                          <div key={ex.exchange} className="flex items-center justify-between bg-gray-800/40 rounded-lg px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${ex.exchange === 'binance' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                              <span className="text-sm text-gray-300">{ex.exchange.charAt(0).toUpperCase() + ex.exchange.slice(1)}</span>
                            </div>
                            <div className="flex items-center gap-6">
                              <span className="text-sm text-gray-400 font-mono">
                                {ex.total.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                              </span>
                              <span className="text-sm text-[var(--text)] font-mono">
                                ${ex.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {connected && !bookEntry && (
                  <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-6 text-center">
                    <p className="text-[var(--text-muted)]">No {symbol} position found across your connected exchanges.</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── TRADE IDEAS TAB ─── */}
            {topTab === 'trade-ideas' && (
              <TradeIdeas symbol={symbol} currentPrice={stats?.price} />
            )}
          </>
        )}
      </main>

    </div>
  );
}

function StatCard({
  label,
  value,
  subLabel,
  valueClass = 'text-[var(--text)]',
}: {
  label: string;
  value: string;
  subLabel?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-xl p-4">
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${valueClass}`}>{value}</p>
      {subLabel && <p className="text-xs text-gray-600 mt-0.5">{subLabel}</p>}
    </div>
  );
}
