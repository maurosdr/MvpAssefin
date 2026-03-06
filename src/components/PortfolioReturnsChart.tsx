'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PortfolioHistoryPoint, ManualPosition } from '@/types/portfolio';
import { buildPortfolioHistory } from '@/lib/portfolio-calculations';

interface Props {
  positions: ManualPosition[];
  cryptoSymbols?: string[];
  onBacktestData?: (data: PortfolioHistoryPoint[]) => void;
}

type BacktestRange = '3mo' | '6mo' | '1y' | '2y';

function getRangeForDate(dateStr: string): BacktestRange {
  const diffDays = Math.ceil((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (diffDays <= 90) return '3mo';
  if (diffDays <= 180) return '6mo';
  if (diffDays <= 365) return '1y';
  return '2y';
}

export default function PortfolioReturnsChart({ positions, cryptoSymbols = [], onBacktestData }: Props) {
  const [backtestEnabled, setBacktestEnabled] = useState(false);
  const [backtestRange, setBacktestRange] = useState<BacktestRange>('1y');
  const [backtestData, setBacktestData] = useState<PortfolioHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [sincePurchaseDate, setSincePurchaseDate] = useState<string | null>(null);

  const positionsRef = useRef(positions);
  const cryptoRef = useRef(cryptoSymbols);
  const onDataRef = useRef(onBacktestData);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => { cryptoRef.current = cryptoSymbols; }, [cryptoSymbols]);
  useEffect(() => { onDataRef.current = onBacktestData; }, [onBacktestData]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // ── helpers ────────────────────────────────────────────────────────────────

  function buildPositionArrays() {
    const curPositions = positionsRef.current;
    const curCrypto = cryptoRef.current;
    const allSymbols: string[] = [];
    const allTypes: string[] = [];
    const allWeights: number[] = [];

    for (const p of curPositions) {
      if (p.type !== 'prediction' && p.type !== 'crypto') {
        allSymbols.push(p.symbol);
        allTypes.push(p.type);
        allWeights.push(p.quantity * p.entryPrice);
      }
    }
    for (const sym of curCrypto) {
      allSymbols.push(sym);
      allTypes.push('crypto');
      allWeights.push(1);
    }
    return { allSymbols, allTypes, allWeights };
  }

  async function doFetch(range: BacktestRange, startDate: string | null, ctrl: AbortController) {
    const { allSymbols, allTypes, allWeights } = buildPositionArrays();
    if (allSymbols.length === 0) { setLoading(false); return; }

    setLoading(true);
    try {
      const params = new URLSearchParams({ symbols: allSymbols.join(','), types: allTypes.join(','), range });
      const res = await fetch(`/api/portfolio/historical?${params}`, { signal: ctrl.signal });

      if (ctrl.signal.aborted) return;
      if (!res.ok) { setLoading(false); return; }

      const data = await res.json();
      if (ctrl.signal.aborted) return;

      const { dates, prices } = data as { dates: string[]; prices: Record<string, (number | null)[]> };

      // Slice to startDate if provided
      const sliceIdx = startDate ? Math.max(0, dates.findIndex((d: string) => d >= startDate)) : 0;
      const filteredDates: string[] = dates.slice(sliceIdx);

      const totalWeight = allWeights.reduce((a, b) => a + b, 0) || 1;
      const positionSeries = allSymbols
        .map((sym, i) => ({
          symbol: sym,
          prices: ((prices[sym] || []).slice(sliceIdx)).map((p: number | null) => p ?? 0),
          weight: allWeights[i] / totalWeight,
        }))
        .filter((s) => s.prices.length > 0 && s.prices.some((p) => p > 0));

      const history = buildPortfolioHistory(filteredDates, positionSeries);

      if (!ctrl.signal.aborted) {
        setBacktestData(history);
        onDataRef.current?.(history);
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }

  // ── fetch callbacks ────────────────────────────────────────────────────────

  const fetchBacktest = useCallback(async (range: BacktestRange) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSincePurchaseDate(null);
    await doFetch(range, null, ctrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSincePurchase = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Find earliest entry date among non-prediction / non-crypto manual positions
    const entryDates = positionsRef.current
      .filter((p) => p.type !== 'prediction' && p.type !== 'crypto' && p.entryDate)
      .map((p) => p.entryDate)
      .sort();

    const earliestDate = entryDates[0] ?? null;
    const range = earliestDate ? getRangeForDate(earliestDate) : '1y';
    setSincePurchaseDate(earliestDate);
    await doFetch(range, earliestDate, ctrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── trigger ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (backtestEnabled) {
      fetchBacktest(backtestRange);
    } else {
      fetchSincePurchase();
    }
  }, [backtestEnabled, backtestRange, fetchBacktest, fetchSincePurchase]);

  const hasData = backtestData.length > 0;

  // Format date for badge
  const sinceDateLabel = sincePurchaseDate
    ? new Date(sincePurchaseDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider shrink-0">
            Rentabilidade do Portfolio
          </h3>
          {!backtestEnabled && sinceDateLabel && hasData && (
            <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border)] px-2 py-0.5 rounded-full shrink-0">
              Desde {sinceDateLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {backtestEnabled && (
            <div className="flex gap-1">
              {(['3mo', '6mo', '1y', '2y'] as BacktestRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setBacktestRange(r)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    backtestRange === r
                      ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setBacktestEnabled((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              backtestEnabled
                ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                : 'bg-gray-800 text-[var(--text-secondary)] border border-[var(--border)]'
            }`}
          >
            Backtest {backtestEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="h-64">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[var(--text-muted)]">Carregando dados históricos...</span>
            </div>
          </div>
        ) : !hasData ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
            Adicione posições para visualizar a rentabilidade
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={backtestData}>
              <defs>
                <linearGradient id="returnGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                tickFormatter={(d: string) => {
                  const date = new Date(d);
                  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload as PortfolioHistoryPoint;
                  return (
                    <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg">
                      <p className="text-xs text-[var(--text-muted)]">{d.date}</p>
                      <p className={`text-sm font-semibold ${d.returnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {d.returnPct >= 0 ? '+' : ''}{d.returnPct.toFixed(2)}%
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="returnPct"
                stroke="#22c55e"
                fill="url(#returnGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
