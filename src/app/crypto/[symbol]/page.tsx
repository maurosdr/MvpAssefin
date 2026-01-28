'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TechnicalChart from '@/components/TechnicalChart';
import BinanceLoginModal from '@/components/BinanceLoginModal';
import { useBinance } from '@/context/BinanceContext';
import { getCryptoName } from '@/lib/crypto-names';
import { calculateRSI, calculateSMA, calculateVolatility } from '@/lib/indicators';
import { OHLCV } from '@/types/crypto';

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
  const { connected, positions, refreshPortfolio } = useBinance();
  const [stats, setStats] = useState<CryptoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBinanceModal, setShowBinanceModal] = useState(false);

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
      refreshPortfolio();
    }
  }, [connected, refreshPortfolio]);

  const position = positions.find((p) => p.asset === symbol);

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
    return 'text-yellow-400';
  };

  const getRsiLabel = (rsi: number) => {
    if (rsi >= 70) return 'Overbought';
    if (rsi <= 30) return 'Oversold';
    return 'Neutral';
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {getCryptoName(symbol)} <span className="text-gray-500 font-normal">({symbol})</span>
                </h1>
                {stats && (
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-2xl font-bold text-white">{formatPrice(stats.price)}</span>
                    <span
                      className={`text-sm font-medium px-2 py-0.5 rounded ${
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

            <button
              onClick={() => setShowBinanceModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                connected
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L6.5 7.5 12 13l5.5-5.5L12 2zm0 22l5.5-5.5L12 13l-5.5 5.5L12 24zm-10-10l5.5 5.5L13 12 7.5 6.5 2 12zm20 0l-5.5-5.5L11 12l5.5 5.5L22 12z" />
              </svg>
              {connected ? 'Connected' : 'Connect'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard label="Live Price" value={formatPrice(stats.price)} />
                <StatCard label="24h Volume" value={formatVolume(stats.volume24h)} />
                <StatCard label="MA (20)" value={formatPrice(stats.ma20)} />
                <StatCard
                  label="Volatility (30d)"
                  value={`${stats.volatility30d.toFixed(1)}%`}
                  valueClass={stats.volatility30d > 80 ? 'text-red-400' : stats.volatility30d > 40 ? 'text-yellow-400' : 'text-green-400'}
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
                  valueClass="text-gray-500"
                />
              </div>
            )}

            {/* 24h Range */}
            {stats && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
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

            {/* Technical Chart */}
            <TechnicalChart symbol={symbol} />

            {/* Binance Position */}
            {connected && position && (
              <div className="bg-gray-900/50 border border-yellow-500/30 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L6.5 7.5 12 13l5.5-5.5L12 2zm0 22l5.5-5.5L12 13l-5.5 5.5L12 24zm-10-10l5.5 5.5L13 12 7.5 6.5 2 12zm20 0l-5.5-5.5L11 12l5.5 5.5L22 12z" />
                  </svg>
                  Your {symbol} Position
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Total</p>
                    <p className="text-white font-mono text-lg">{position.total.toLocaleString(undefined, { maximumFractionDigits: 8 })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Available</p>
                    <p className="text-white font-mono text-lg">{position.free.toLocaleString(undefined, { maximumFractionDigits: 8 })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Locked</p>
                    <p className="text-white font-mono text-lg">{position.locked.toLocaleString(undefined, { maximumFractionDigits: 8 })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">USD Value</p>
                    <p className="text-yellow-400 font-mono text-lg font-bold">
                      ${position.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {connected && !position && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center">
                <p className="text-gray-500">No {symbol} position found in your Binance account.</p>
              </div>
            )}
          </>
        )}
      </main>

      <BinanceLoginModal open={showBinanceModal} onClose={() => setShowBinanceModal(false)} />
    </div>
  );
}

function StatCard({
  label,
  value,
  subLabel,
  valueClass = 'text-white',
}: {
  label: string;
  value: string;
  subLabel?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${valueClass}`}>{value}</p>
      {subLabel && <p className="text-xs text-gray-600 mt-0.5">{subLabel}</p>}
    </div>
  );
}
