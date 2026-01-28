'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { OHLCV, TimeWindow, TechnicalIndicator } from '@/types/crypto';
import {
  calculateSMA,
  calculateEMA,
  calculateMACD,
  calculateBollingerBands,
  calculateIchimoku,
} from '@/lib/indicators';

const WINDOWS: { label: string; value: TimeWindow }[] = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
];

const INDICATORS: { label: string; value: TechnicalIndicator; color: string }[] = [
  { label: 'MA (20)', value: 'ma', color: '#f59e0b' },
  { label: 'EMA (20)', value: 'ema', color: '#8b5cf6' },
  { label: 'Ichimoku', value: 'ichimoku', color: '#06b6d4' },
  { label: 'MACD', value: 'macd', color: '#ec4899' },
  { label: 'Bollinger', value: 'bollinger', color: '#10b981' },
];

interface ChartPoint {
  date: string;
  timestamp: number;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  ma20?: number | null;
  ema20?: number | null;
  bollingerUpper?: number | null;
  bollingerMiddle?: number | null;
  bollingerLower?: number | null;
  ichimokuTenkan?: number | null;
  ichimokuKijun?: number | null;
  ichimokuSenkouA?: number | null;
  ichimokuSenkouB?: number | null;
  macd?: number | null;
  macdSignal?: number | null;
  macdHistogram?: number | null;
}

export default function TechnicalChart({ symbol }: { symbol: string }) {
  const [window, setWindow] = useState<TimeWindow>('3m');
  const [activeIndicators, setActiveIndicators] = useState<TechnicalIndicator[]>([]);
  const [rawData, setRawData] = useState<OHLCV[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crypto/ohlcv?symbol=${symbol}/USDT&window=${window}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRawData(data);
      }
    } catch {
      setRawData([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, window]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleIndicator = (ind: TechnicalIndicator) => {
    setActiveIndicators((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]
    );
  };

  const chartData: ChartPoint[] = useMemo(() => {
    if (rawData.length === 0) return [];

    const closes = rawData.map((d) => d.close);
    const ma20 = activeIndicators.includes('ma') ? calculateSMA(closes, 20) : null;
    const ema20 = activeIndicators.includes('ema') ? calculateEMA(closes, 20) : null;
    const bollinger = activeIndicators.includes('bollinger')
      ? calculateBollingerBands(closes)
      : null;
    const ichimoku = activeIndicators.includes('ichimoku') ? calculateIchimoku(rawData) : null;
    const macd = activeIndicators.includes('macd') ? calculateMACD(closes) : null;

    return rawData.map((d, i) => ({
      date: new Date(d.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(window === '1d' ? { hour: '2-digit', minute: '2-digit' } : {}),
      }),
      timestamp: d.timestamp,
      close: d.close,
      open: d.open,
      high: d.high,
      low: d.low,
      volume: d.volume,
      ma20: ma20?.[i] ?? undefined,
      ema20: ema20?.[i] ?? undefined,
      bollingerUpper: bollinger?.upper[i] ?? undefined,
      bollingerMiddle: bollinger?.middle[i] ?? undefined,
      bollingerLower: bollinger?.lower[i] ?? undefined,
      ichimokuTenkan: ichimoku?.tenkan[i] ?? undefined,
      ichimokuKijun: ichimoku?.kijun[i] ?? undefined,
      ichimokuSenkouA: ichimoku?.senkouA[i] ?? undefined,
      ichimokuSenkouB: ichimoku?.senkouB[i] ?? undefined,
      macd: macd?.macd[i] ?? undefined,
      macdSignal: macd?.signal[i] ?? undefined,
      macdHistogram: macd?.histogram[i] ?? undefined,
    }));
  }, [rawData, activeIndicators, window]);

  const priceChange =
    chartData.length >= 2
      ? ((chartData[chartData.length - 1].close - chartData[0].close) / chartData[0].close) * 100
      : 0;
  const isPositive = priceChange >= 0;
  const showMacd = activeIndicators.includes('macd');

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">{symbol}/USDT</h2>
            {chartData.length > 0 && (
              <span
                className={`text-sm font-medium px-2 py-0.5 rounded ${
                  isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {isPositive ? '+' : ''}
                {priceChange.toFixed(2)}%
              </span>
            )}
          </div>
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                onClick={() => setWindow(w.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  window === w.value
                    ? 'bg-yellow-500 text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Indicator toggles */}
        <div className="flex flex-wrap gap-2">
          {INDICATORS.map((ind) => (
            <button
              key={ind.value}
              onClick={() => toggleIndicator(ind.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                activeIndicators.includes(ind.value)
                  ? 'border-opacity-100 bg-opacity-20'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300'
              }`}
              style={
                activeIndicators.includes(ind.value)
                  ? { borderColor: ind.color, backgroundColor: ind.color + '20', color: ind.color }
                  : {}
              }
            >
              {ind.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart */}
      <div className={showMacd ? 'h-[350px]' : 'h-[450px]'}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ichimokuCloud" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(2)}`)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontSize: '12px',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => {
                  const labels: Record<string, string> = {
                    close: 'Price',
                    ma20: 'MA(20)',
                    ema20: 'EMA(20)',
                    bollingerUpper: 'BB Upper',
                    bollingerMiddle: 'BB Middle',
                    bollingerLower: 'BB Lower',
                    ichimokuTenkan: 'Tenkan',
                    ichimokuKijun: 'Kijun',
                    ichimokuSenkouA: 'Senkou A',
                    ichimokuSenkouB: 'Senkou B',
                  };
                  return [`$${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, labels[name] || name];
                }}
              />

              {/* Price area */}
              <Area type="monotone" dataKey="close" stroke={isPositive ? '#22c55e' : '#ef4444'} strokeWidth={2} fill="url(#priceGrad)" />

              {/* Bollinger Bands */}
              {activeIndicators.includes('bollinger') && (
                <>
                  <Line type="monotone" dataKey="bollingerUpper" stroke="#10b981" strokeWidth={1} dot={false} strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="bollingerMiddle" stroke="#10b981" strokeWidth={1} dot={false} opacity={0.5} />
                  <Line type="monotone" dataKey="bollingerLower" stroke="#10b981" strokeWidth={1} dot={false} strokeDasharray="4 2" />
                </>
              )}

              {/* MA */}
              {activeIndicators.includes('ma') && (
                <Line type="monotone" dataKey="ma20" stroke="#f59e0b" strokeWidth={2} dot={false} />
              )}

              {/* EMA */}
              {activeIndicators.includes('ema') && (
                <Line type="monotone" dataKey="ema20" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              )}

              {/* Ichimoku */}
              {activeIndicators.includes('ichimoku') && (
                <>
                  <Line type="monotone" dataKey="ichimokuTenkan" stroke="#ef4444" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="ichimokuKijun" stroke="#3b82f6" strokeWidth={1} dot={false} />
                  <Area type="monotone" dataKey="ichimokuSenkouA" stroke="#06b6d4" strokeWidth={1} fill="url(#ichimokuCloud)" dot={false} />
                  <Line type="monotone" dataKey="ichimokuSenkouB" stroke="#06b6d4" strokeWidth={1} dot={false} strokeDasharray="4 2" />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* MACD Sub-chart */}
      {showMacd && chartData.length > 0 && (
        <div className="mt-4 border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">MACD (12, 26, 9)</p>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReferenceLine y={0} stroke="#374151" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="macdHistogram" fill="#ec4899" opacity={0.5} />
                <Line type="monotone" dataKey="macd" stroke="#ec4899" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="macdSignal" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
