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

export default function PortfolioReturnsChart({ positions, cryptoSymbols = [], onBacktestData }: Props) {
  const [backtestEnabled, setBacktestEnabled] = useState(false);
  const [backtestRange, setBacktestRange] = useState<BacktestRange>('1y');
  const [backtestData, setBacktestData] = useState<PortfolioHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  // Refs so the fetch function always sees latest values without being a dep
  const positionsRef = useRef(positions);
  const cryptoRef = useRef(cryptoSymbols);
  const onDataRef = useRef(onBacktestData);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => { cryptoRef.current = cryptoSymbols; }, [cryptoSymbols]);
  useEffect(() => { onDataRef.current = onBacktestData; }, [onBacktestData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const fetchBacktest = useCallback(async (range: BacktestRange) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const curPositions = positionsRef.current;
    const curCrypto = cryptoRef.current;

    const allSymbols: string[] = [];
    const allTypes: string[] = [];
    const allWeights: number[] = [];

    // Stock/ETF/BDR positions
    for (const p of curPositions) {
      if (p.type !== 'prediction' && p.type !== 'crypto') {
        allSymbols.push(p.symbol);
        allTypes.push(p.type);
        allWeights.push(p.quantity * p.entryPrice);
      }
    }

    // Crypto positions
    for (const sym of curCrypto) {
      allSymbols.push(sym);
      allTypes.push('crypto');
      allWeights.push(1);
    }

    if (allSymbols.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        symbols: allSymbols.join(','),
        types: allTypes.join(','),
        range,
      });

      const res = await fetch(`/api/portfolio/historical?${params}`, {
        signal: ctrl.signal,
      });

      if (ctrl.signal.aborted) return;
      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (ctrl.signal.aborted) return;

      const { dates, prices } = data as {
        dates: string[];
        prices: Record<string, (number | null)[]>;
      };

      const totalWeight = allWeights.reduce((a, b) => a + b, 0) || 1;
      const positionSeries = allSymbols
        .map((sym, i) => ({
          symbol: sym,
          prices: (prices[sym] || []).map((p: number | null) => p ?? 0),
          weight: allWeights[i] / totalWeight,
        }))
        .filter((s) => s.prices.length > 0 && s.prices.some((p) => p > 0));

      const history = buildPortfolioHistory(dates, positionSeries);

      if (!ctrl.signal.aborted) {
        setBacktestData(history);
        onDataRef.current?.(history);
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // intentional cancel
      // Actual error: stop loading
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []); // stable: reads from refs, no external deps

  // Trigger fetch only when backtestEnabled or backtestRange changes
  useEffect(() => {
    if (backtestEnabled) {
      fetchBacktest(backtestRange);
    } else {
      // Disable: cancel any in-flight request and clear data
      abortRef.current?.abort();
      setBacktestData([]);
      setLoading(false);
      onDataRef.current?.([]);
    }
  }, [backtestEnabled, backtestRange, fetchBacktest]);

  const hasData = backtestData.length > 0;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Rentabilidade do Portfolio
        </h3>
        <div className="flex items-center gap-2">
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
        ) : !backtestEnabled ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
            Ative o Backtest para visualizar a rentabilidade histórica
          </div>
        ) : !hasData ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
            Adicione posições para realizar o backtest
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
