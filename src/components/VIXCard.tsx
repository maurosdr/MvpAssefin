'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
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
    fetch('/api/market/vix')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isPositive = (data?.ytdChange ?? 0) >= 0;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          VIX Index
        </h2>
        <span className="text-xs text-gray-500">Year-to-Date</span>
      </div>

      {loading ? (
        <div className="h-[180px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <>
          <div className="flex items-end gap-3 mb-4">
            <span className="text-3xl font-bold text-white font-mono">{data.current.toFixed(2)}</span>
            <span
              className={`text-sm font-medium px-2 py-0.5 rounded mb-1 ${
                isPositive ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
              }`}
            >
              {isPositive ? '+' : ''}{data.ytdChange.toFixed(2)}% YTD
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <span>Jan 1: {data.ytdStartValue.toFixed(2)}</span>
            <span className="text-gray-700">|</span>
            <span>Now: {data.current.toFixed(2)}</span>
          </div>

          <div className="h-[100px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.data}>
                <defs>
                  <linearGradient id="vixGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [(value ?? 0).toFixed(2), 'VIX']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#vixGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p className="text-gray-500 text-sm">Unable to load VIX data</p>
      )}
    </div>
  );
}
