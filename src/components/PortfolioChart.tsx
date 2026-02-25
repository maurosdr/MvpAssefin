'use client';

import { useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { usePortfolio } from '@/context/PortfolioContext';

const TIME_RANGES = [
  { key: '1w', label: '1S' },
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1A' },
] as const;

export default function PortfolioChart() {
  const { summary, loading, refresh, timeRange, setTimeRange } = usePortfolio();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const history = summary?.history || [];
  const currentValue = summary?.totalValue || 0;
  const firstValue = history.length > 0 ? history[0].totalValue : currentValue;
  const pnl = currentValue - firstValue;
  const pnlPercent = firstValue > 0 ? (pnl / firstValue) * 100 : 0;
  const isPositive = pnl >= 0;

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Portfolio Value
          </h2>
          <p className="text-3xl font-bold text-[var(--text)] mt-2 font-mono">
            ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={`text-sm font-medium mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {' '}({isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%)
            <span className="text-[var(--text-muted)] ml-2">{timeRange}</span>
          </p>
        </div>

        <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
          {TIME_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setTimeRange(r.key as typeof timeRange)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeRange === r.key
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[300px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
            Connect an exchange to see portfolio history
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(d) => {
                  const date = new Date(d);
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0b0f19',
                  border: '1px solid #1f2937',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                }}
                formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Value']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="totalValue"
                stroke={isPositive ? '#22c55e' : '#ef4444'}
                strokeWidth={2}
                fill="url(#portfolioGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
