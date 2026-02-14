'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface VIXData {
  current: number;
  ytdChange: number;
  ytdStartValue: number;
  data: { date: string; value: number }[];
}

export default function VIXCard() {
  const [data, setData] = useState<VIXData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/market/vix', { cache: 'no-store' });
        const data = await res.json();
        setData(data);
      } catch {
        // Error handling
      } finally {
        setLoading(false);
      }
    };
    
    // Delay para não competir com outras chamadas
    setTimeout(fetchData, 400);
  }, []);

  const isPositive = (data?.ytdChange ?? 0) >= 0;

  return (
    <div className="modern-card">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[var(--border)]">
        <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
        <h2 className="section-title text-[var(--accent)]">
          VIX INDEX
        </h2>
      </div>

      {loading ? (
        <div className="h-[180px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <>
          <div className="flex items-end gap-4 mb-6">
            <span className="text-4xl font-bold data-value text-[var(--text-primary)]">{data.current.toFixed(2)}</span>
            <span
              className={`data-value text-sm font-bold px-3 py-1.5 rounded-lg mb-1 ${
                isPositive ? 'bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/20' : 'bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]/20'
              }`}
            >
              {isPositive ? '+' : ''}{data.ytdChange.toFixed(2)}% YTD
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mb-4 pb-4 border-b border-[var(--border-subtle)]">
            <span className="data-value">Jan 1: {data.ytdStartValue.toFixed(2)}</span>
            <span className="text-[var(--border-strong)]">|</span>
            <span className="data-value">Now: {data.current.toFixed(2)}</span>
          </div>

          <div className="h-[120px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.data}>
                <defs>
                  <linearGradient id="vixGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="#a855f7"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="#a855f7"
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
                  domain={['auto', 'auto']}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b0f19',
                    border: '1px solid #1f2937',
                    borderRadius: '0.75rem',
                    fontSize: '0.75rem',
                  }}
                  formatter={(value) => {
                    if (typeof value !== 'number') return ['-', 'VIX'];
                    return [`${value.toFixed(2)}`, 'VIX'];
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#vixGrad)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p className="text-[var(--text-muted)] text-sm">Unable to load VIX data</p>
      )}
    </div>
  );
}
