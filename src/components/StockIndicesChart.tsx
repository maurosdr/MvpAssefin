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

type TimeWindow = '1d' | '1w' | '1m' | '3m' | '6m' | '1y';

const WINDOWS: { label: string; value: TimeWindow }[] = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
];

const INDICES = [
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^IXIC', name: 'Nasdaq' },
  { symbol: '^DJI', name: 'Dow Jones' },
  { symbol: '^FTSE', name: 'FTSE 100' },
  { symbol: '^GDAXI', name: 'DAX' },
  { symbol: '^N225', name: 'Nikkei 225' },
  { symbol: '^BVSP', name: 'Bovespa' },
  { symbol: '^HSI', name: 'Hang Seng' },
];

interface ChartDataPoint {
  timestamp: number;
  close: number;
  date: string;
}

export default function StockIndicesChart() {
  const [selected, setSelected] = useState('^GSPC');
  const [window, setWindow] = useState<TimeWindow>('1m');
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexInfo, setIndexInfo] = useState<{ name: string; changePercent: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market/indices?symbol=${encodeURIComponent(selected)}&window=${window}`, {
        cache: 'no-store',
      });
      const result = await res.json();
      if (result.data && Array.isArray(result.data)) {
        setData(result.data);
        setIndexInfo({ name: result.name, changePercent: result.changePercent });
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

  const closes = data.map((d) => d.close).filter((c) => c > 0);
  const dataMin = closes.length > 0 ? Math.min(...closes) : 0;
  const dataMax = closes.length > 0 ? Math.max(...closes) : 0;
  const yMin = dataMin * 0.98;
  const yMax = dataMax * 1.02;

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Stock Indices
          </h2>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            {INDICES.map((idx) => (
              <option key={idx.symbol} value={idx.symbol}>
                {idx.name}
              </option>
            ))}
          </select>
          {indexInfo && (
            <span
              className={`text-sm font-medium px-2 py-0.5 rounded ${
                isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
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
                  : 'text-gray-400 hover:text-[var(--text)]'
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
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="indexGradient" x1="0" y1="0" x2="0" y2="1">
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
                domain={[yMin, yMax]}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
                  return v.toFixed(0);
                }}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: '#0b0f19',
                  border: '1px solid #1f2937',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                }}
                formatter={(value) => {
                  if (typeof value !== 'number') return ['-', 'Value'];
                  return [
                    `${value.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}`,
                    'Value',
                  ];
                }}
              />

              <Area
                type="monotone"
                dataKey="close"
                stroke={isPositive ? '#22c55e' : '#ef4444'}
                strokeWidth={2}
                fill="url(#indexGradient)"
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
