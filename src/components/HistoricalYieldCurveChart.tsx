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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface YieldPoint {
  maturity: string;
  label: string;
  yield: number;
}

interface CurveData {
  points: YieldPoint[];
  date: string;
}

interface CurrentYieldResponse {
  pre?: CurveData | null;
  ipca?: CurveData | null;
}

interface HistoricalYieldResponse {
  pre: CurveData;
  ipca: CurveData;
}

type TabType = 'pre' | 'ipca';

// ---------------------------------------------------------------------------
// Tab configuration
// ---------------------------------------------------------------------------
const TAB_CONFIG: Record<
  TabType,
  { label: string; color: string; unit: string }
> = {
  pre:  { label: 'PRE (ETTJ Prefixado)', color: '#22c55e', unit: '% a.a.' },
  ipca: { label: 'IPCA (ETTJ IPCA)',     color: '#f97316', unit: '% a.a.' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function HistoricalYieldCurveChart() {
  const [activeTab, setActiveTab] = useState<TabType>('pre');
  const [historicalDate, setHistoricalDate] = useState('');
  const [currentData, setCurrentData] = useState<CurrentYieldResponse | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalYieldResponse | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [historicalError, setHistoricalError] = useState('');

  // ---- Fetch current yield curve ----
  const fetchCurrent = useCallback(async () => {
    setLoadingCurrent(true);
    try {
      const res = await fetch('/api/market/yields/brazil');
      const result: CurrentYieldResponse = await res.json();
      setCurrentData(result);
    } catch {
      setCurrentData(null);
    } finally {
      setLoadingCurrent(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  // ---- Fetch historical yield curve ----
  const fetchHistorical = useCallback(async (date: string) => {
    if (!date) {
      setHistoricalData(null);
      setHistoricalError('');
      return;
    }

    setLoadingHistorical(true);
    setHistoricalError('');
    try {
      const res = await fetch(`/api/market/yields/brazil/historical?date=${date}`);
      if (!res.ok) {
        setHistoricalError('Erro ao buscar dados históricos');
        setHistoricalData(null);
        return;
      }
      const result: HistoricalYieldResponse = await res.json();
      setHistoricalData(result);
    } catch {
      setHistoricalError('Erro ao buscar dados históricos');
      setHistoricalData(null);
    } finally {
      setLoadingHistorical(false);
    }
  }, []);

  useEffect(() => {
    fetchHistorical(historicalDate);
  }, [historicalDate, fetchHistorical]);

  // ---- Resolve points for the active tab ----
  const currentPoints: YieldPoint[] = (() => {
    if (!currentData) return [];
    if (activeTab === 'pre') return currentData.pre?.points ?? [];
    return currentData.ipca?.points ?? [];
  })();

  const currentDate: string = (() => {
    if (!currentData) return '';
    if (activeTab === 'pre') return currentData.pre?.date ?? '';
    return currentData.ipca?.date ?? '';
  })();

  const historicalPoints: YieldPoint[] = (() => {
    if (!historicalData) return [];
    if (activeTab === 'pre') return historicalData.pre?.points ?? [];
    return historicalData.ipca?.points ?? [];
  })();

  const historicalDateLabel: string = (() => {
    if (!historicalData) return '';
    if (activeTab === 'pre') return historicalData.pre?.date ?? '';
    return historicalData.ipca?.date ?? '';
  })();

  // ---- Build chart data by merging current + historical on label ----
  const chartData = currentPoints.map((point) => {
    const histPoint = historicalPoints.find((h) => h.maturity === point.maturity);
    return {
      label: point.label,
      current: point.yield,
      ...(histPoint ? { historical: histPoint.yield } : {}),
    };
  });

  // If historical has labels not in current, append them
  if (historicalPoints.length > 0) {
    for (const hp of historicalPoints) {
      if (!chartData.find((d) => d.label === hp.label)) {
        chartData.push({
          label: hp.label,
          current: undefined as unknown as number,
          historical: hp.yield,
        });
      }
    }
  }

  const cfg = TAB_CONFIG[activeTab];

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Curva de Juros - Comparativo Hist&oacute;rico
            </h2>
            {currentDate && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Atual: {currentDate}
                {historicalDateLabel && ` vs Hist\u00f3rico: ${historicalDateLabel}`}
              </p>
            )}
          </div>
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm text-[var(--text-muted)]">Data hist&oacute;rica:</label>
          <input
            type="date"
            value={historicalDate}
            onChange={(e) => setHistoricalDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          {historicalDate && (
            <button
              onClick={() => setHistoricalDate('')}
              className="text-[var(--text-muted)] hover:text-red-400 p-1"
              title="Limpar data"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs: PRE / IPCA */}
      <div className="flex items-center gap-2 mb-4">
        {(Object.keys(TAB_CONFIG) as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
              activeTab === tab
                ? 'border-[var(--accent)] text-[var(--text)] bg-gray-800'
                : 'border-gray-700 text-[var(--text-muted)] bg-gray-800/40 hover:text-[var(--text)] hover:border-gray-600'
            }`}
          >
            {TAB_CONFIG[tab].label}
          </button>
        ))}
      </div>

      {/* Source badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] text-[var(--text-muted)] bg-gray-800/60 px-2 py-0.5 rounded-full border border-gray-700">
          Fonte: BCB SGS (ETTJ) &bull; Spline c&uacute;bico
        </span>
        {loadingHistorical && (
          <span className="text-[10px] text-yellow-400">Carregando hist&oacute;rico...</span>
        )}
        {historicalError && (
          <span className="text-[10px] text-red-400">{historicalError}</span>
        )}
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        {loadingCurrent ? (
          <div className="h-full flex items-center justify-center">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: cfg.color, borderTopColor: 'transparent' }}
            />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
            Dados indispon&iacute;veis
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
                      ? `Atual (${currentDate})`
                      : `Hist\u00f3rico (${historicalDateLabel})`,
                  ];
                }}
              />
              <Legend
                formatter={(value) =>
                  value === 'current'
                    ? `Atual (${currentDate})`
                    : `Hist\u00f3rico (${historicalDateLabel})`
                }
              />
              {/* Current curve: solid line */}
              <Line
                type="linear"
                dataKey="current"
                stroke={cfg.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: cfg.color }}
                name="current"
                connectNulls
              />
              {/* Historical curve: dashed line */}
              {historicalData && historicalPoints.length > 0 && (
                <Line
                  type="linear"
                  dataKey="historical"
                  stroke={cfg.color}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  strokeOpacity={0.6}
                  dot={false}
                  activeDot={{ r: 4, fill: cfg.color }}
                  name="historical"
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
