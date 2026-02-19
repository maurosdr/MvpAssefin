'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TimeWindow } from '@/types/crypto';

const WINDOWS: { label: string; value: TimeWindow }[] = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
];

interface ChartDataPoint {
  timestamp: number;
  close: number;
  volume: number;
  date: string;
}

export default function PriceChart({
  symbol,
  availableCryptos,
}: {
  symbol?: string;
  availableCryptos?: { base: string }[];
}) {
  const [selected, setSelected] = useState(symbol || 'BTC');
  const [window, setWindow] = useState<TimeWindow>('1m');
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/crypto/ohlcv?symbol=${selected}/USDT&window=${window}`,
        { cache: 'no-store' }
      );
      const ohlcv = await res.json();
      if (Array.isArray(ohlcv)) {
        setData(
          ohlcv.map((c: { timestamp: number; close: number; volume: number }) => ({
            ...c,
            date: new Date(c.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              ...(window === '1d'
                ? { hour: '2-digit', minute: '2-digit' }
                : {}),
            }),
          }))
        );
      }
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [selected, window]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const priceChange =
    data.length >= 2
      ? ((data[data.length - 1].close - data[0].close) / data[0].close) * 100
      : 0;

  const isPositive = priceChange >= 0;

  return (
    <div className="modern-card">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
          <h2 className="section-title text-[var(--accent)]">
            PRICE CHART
          </h2>

          {!symbol && availableCryptos && (
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-all"
            >
              {availableCryptos.map((c) => (
                <option key={c.base} value={c.base}>
                  {c.base}
                </option>
              ))}
            </select>
          )}

          {data.length > 0 && (
            <span
              className={`data-value text-sm font-bold px-3 py-1.5 rounded-lg ${
                isPositive
                  ? 'bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]/20'
                  : 'bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/20'
              }`}
            >
              {isPositive ? '+' : ''}
              {priceChange.toFixed(2)}%
            </span>
          )}
        </div>

        {/* TIME WINDOWS */}
        <div className="flex gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              onClick={() => setWindow(w.value)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                window === w.value
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-lg shadow-[var(--accent)]/20'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* CHART */}
      <div className="h-[400px] -mx-2">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isPositive ? '#22c55e' : '#ef4444'}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor={isPositive ? '#22c55e' : '#ef4444'}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(2)}`
                }
                domain={[
                  (dataMin: number) => dataMin * 0.98,
                  (dataMax: number) => dataMax * 1.02,
                ]}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: '#0b0f19',
                  border: '1px solid #1f2937',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                }}
                formatter={(value) => {
                  if (typeof value !== 'number') return ['-', 'Price'];

                  return [
                    `$${value.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}`,
                    'Price',
                  ];
                }}
              />


              <Area
                type="monotone"
                dataKey="close"
                stroke={isPositive ? '#22c55e' : '#ef4444'}
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
