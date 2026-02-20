'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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
  // Brazil-specific: separate PRE and IPCA curves
  pre?: { points: YieldPoint[]; date: string } | null;
  ipca?: { points: YieldPoint[]; date: string } | null;
}

type CurveType = 'us' | 'brazil-pre' | 'brazil-ipca';

const CURVE_CONFIG: Record<
  CurveType,
  { label: string; color: string; iconColor: string; unit: string; title: string }
> = {
  'us':          { label: 'US Treasury',       color: '#3b82f6', iconColor: 'text-blue-400',  unit: '%',     title: 'US Treasury Yield Curve'   },
  'brazil-pre':  { label: 'Brasil PRE (ETTJ)',  color: '#22c55e', iconColor: 'text-green-400', unit: '% a.a.', title: 'ETTJ Prefixado – BCB/ANBIMA' },
  'brazil-ipca': { label: 'Brasil IPCA (ETTJ)', color: '#f97316', iconColor: 'text-orange-400',unit: '% a.a.', title: 'ETTJ IPCA – BCB/ANBIMA'         },
};

export default function YieldCurveChart() {
  const [data, setData] = useState<YieldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [compareDate, setCompareDate] = useState('');
  const [showCompare, setShowCompare] = useState(false);
  const [curveType, setCurveType] = useState<CurveType>('us');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint: string;
      if (curveType === 'us') {
        const params = new URLSearchParams();
        if (compareDate) params.set('compareDate', compareDate);
        endpoint = `/api/market/yields?${params.toString()}`;
      } else {
        endpoint = '/api/market/yields/brazil';
      }

      const res = await fetch(endpoint);
      const result: YieldData = await res.json();
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [compareDate, curveType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset comparison when switching to Brazil curves
  useEffect(() => {
    if (curveType !== 'us') {
      setShowCompare(false);
      setCompareDate('');
    }
  }, [curveType]);

  // Resolve which points to display based on curve type
  const currentPoints = (() => {
    if (!data) return [];
    if (curveType === 'brazil-pre')  return data.pre?.points  ?? data.current ?? [];
    if (curveType === 'brazil-ipca') return data.ipca?.points ?? [];
    return data.current ?? [];
  })();

  const currentDate = (() => {
    if (!data) return '';
    if (curveType === 'brazil-pre')  return data.pre?.date  ?? data.currentDate ?? '';
    if (curveType === 'brazil-ipca') return data.ipca?.date ?? '';
    return data.currentDate ?? '';
  })();

  const chartData = currentPoints.map((point) => {
    const compPoint = data?.comparison?.find((c) => c.maturity === point.maturity);
    return {
      label: point.label,
      current: point.yield,
      ...(compPoint ? { comparison: compPoint.yield } : {}),
    };
  });

  const cfg = CURVE_CONFIG[curveType];
  const hasIPCA = !!(data?.ipca?.points?.length);

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <svg className={`w-5 h-5 ${cfg.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              {cfg.title}
            </h2>
            {currentDate && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Referência: {currentDate}
                {data?.comparisonDate && ` vs ${data.comparisonDate}`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Curve selector */}
          <select
            value={curveType}
            onChange={(e) => setCurveType(e.target.value as CurveType)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="us">US Treasury</option>
            <option value="brazil-pre">Brasil PRE (ETTJ)</option>
            <option value="brazil-ipca" disabled={!hasIPCA}>
              Brasil IPCA (ETTJ){!hasIPCA ? ' – indisponível' : ''}
            </option>
          </select>

          {/* Compare date (US only) */}
          {curveType === 'us' && (
            <>
              {!showCompare ? (
                <button
                  onClick={() => setShowCompare(true)}
                  className="px-3 py-1.5 text-sm bg-gray-800 text-gray-400 hover:text-[var(--text)] border border-gray-700 rounded-lg transition-colors"
                >
                  + Comparar Data
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={compareDate}
                    onChange={(e) => setCompareDate(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    onClick={() => { setShowCompare(false); setCompareDate(''); }}
                    className="text-[var(--text-muted)] hover:text-red-400 p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Source badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] text-[var(--text-muted)] bg-gray-800/60 px-2 py-0.5 rounded-full border border-gray-700">
          {curveType === 'us'
            ? 'Fonte: FRED (Federal Reserve) • Spline cúbico'
            : 'Fonte: BCB SGS (ETTJ) • Spline cúbico'}
        </span>
        {curveType === 'brazil-pre' && hasIPCA && (
          <button
            onClick={() => setCurveType('brazil-ipca')}
            className="text-[10px] text-orange-400 underline underline-offset-2"
          >
            Ver IPCA
          </button>
        )}
        {curveType === 'brazil-ipca' && (
          <button
            onClick={() => setCurveType('brazil-pre')}
            className="text-[10px] text-green-400 underline underline-offset-2"
          >
            Ver PRE
          </button>
        )}
      </div>

      <div className="h-[300px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: cfg.color, borderTopColor: 'transparent' }}
            />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
            Dados indisponíveis
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v.toFixed(1)}%`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0b0f19',
                  border: '1px solid #1f2937',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                }}
                formatter={(value, name) => {
                  if (typeof value !== 'number') return ['-', ''];
                  return [
                    `${value.toFixed(2)}${cfg.unit}`,
                    name === 'current'
                      ? `Hoje (${currentDate})`
                      : `Comparação (${data?.comparisonDate ?? ''})`,
                  ];
                }}
              />
              <Legend
                formatter={(value) =>
                  value === 'current' ? 'Atual' : `Comparação (${data?.comparisonDate ?? ''})`
                }
              />
              <Line
                type="linear"
                dataKey="current"
                stroke={cfg.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: cfg.color }}
                name="current"
              />
              {data?.comparison && curveType === 'us' && (
                <Line
                  type="linear"
                  dataKey="comparison"
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 4, fill: '#f97316' }}
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
