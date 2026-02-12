'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

interface YieldPoint {
  maturity: string;
  label: string;
  yield: number;
}

interface YieldData {
  current: YieldPoint[];
  currentDate: string;
  comparison: YieldPoint[] | null;
  comparisonDate: string | null;
}

export default function YieldCurveChart() {
  const [data, setData] = useState<YieldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [compareDate, setCompareDate] = useState('');
  const [showCompare, setShowCompare] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (compareDate) params.set('compareDate', compareDate);
      const res = await fetch(`/api/market/yields?${params.toString()}`);
      const result = await res.json();
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [compareDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Merge current and comparison data for the chart
  const chartData = data?.current.map((point) => {
    const compPoint = data.comparison?.find((c) => c.maturity === point.maturity);
    return {
      label: point.label,
      current: point.yield,
      ...(compPoint ? { comparison: compPoint.yield } : {}),
    };
  }) || [];

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            US Treasury Yield Curve
          </h2>
          {data?.currentDate && (
            <p className="text-xs text-gray-500 mt-1">
              Current: {data.currentDate}
              {data.comparisonDate && ` vs ${data.comparisonDate}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!showCompare ? (
            <button
              onClick={() => setShowCompare(true)}
              className="px-3 py-1.5 text-sm bg-gray-800 text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors"
            >
              + Compare Date
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={compareDate}
                onChange={(e) => setCompareDate(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-yellow-500"
              />
              <button
                onClick={() => {
                  setShowCompare(false);
                  setCompareDate('');
                }}
                className="text-gray-500 hover:text-red-400 p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="h-[300px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={{ stroke: '#374151' }}
                tickFormatter={(v) => `${v.toFixed(1)}%`}
                domain={['auto', 'auto']}
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
                formatter={(value: any, name: any) => [
                  `${(value ?? 0).toFixed(2)}%`,
                  name === 'current' ? `Today (${data?.currentDate || ''})` : `Compare (${data?.comparisonDate || ''})`,
                ]}
              />
              <Legend
                formatter={(value) =>
                  value === 'current' ? `Today` : `${data?.comparisonDate || 'Compare'}`
                }
              />
              <Line
                type="monotone"
                dataKey="current"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#3b82f6' }}
                name="current"
              />
              {data?.comparison && (
                <Line
                  type="monotone"
                  dataKey="comparison"
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: '#f97316' }}
                  name="comparison"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
