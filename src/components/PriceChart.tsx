'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
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
      const res = await fetch(`/api/crypto/ohlcv?symbol=${selected}/USDT&window=${window}`);
      const ohlcv = await res.json();
      if (Array.isArray(ohlcv)) {
        setData(
          ohlcv.map((c: { timestamp: number; close: number; volume: number }) => ({
            ...c,
            date: new Date(c.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              ...(window === '1d' ? { hour: '2-digit', minute: '2-digit' } : {}),
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
    data.length >= 2 ? ((data[data.length - 1].close - data[0].close) / data[0].close) * 100 : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">Price Chart</h2>
          {!symbol && availableCryptos && (
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-yellow-500"
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

      <div className="h-[300px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isPositive ? '#22c55e' : '#ef4444'}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={isPositive ? '#22c55e' : '#ef4444'}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
                tickFormatter={(v) => {
                  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
                  return `$${v.toFixed(2)}`;
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '0.75rem',
                  color: '#fff',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`$${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Price']}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={isPositive ? '#22c55e' : '#ef4444'}
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
