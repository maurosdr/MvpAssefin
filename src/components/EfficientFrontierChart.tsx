'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { EfficientFrontierPoint } from '@/lib/portfolio-calculations';

interface Props {
  points: EfficientFrontierPoint[];
}

function sharpeColor(sharpe: number): string {
  // Map sharpe: <0 red, 0–1 yellow, >1 green
  if (sharpe < 0) return '#ef4444';
  if (sharpe < 1) return '#f59e0b';
  return '#22c55e';
}

export default function EfficientFrontierChart({ points }: Props) {
  const simulated = points.filter((p) => !p.isCurrent && !p.isMaxSharpe);
  const current = points.filter((p) => p.isCurrent);
  const maxSharpe = points.filter((p) => p.isMaxSharpe);

  const isEmpty = points.length === 0;

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { payload: EfficientFrontierPoint }[];
  }) => {
    if (!active || !payload?.[0]) return null;
    const p = payload[0].payload;
    const label = p.isCurrent ? '⭐ Carteira Atual' : p.isMaxSharpe ? '🏆 Maior Sharpe' : 'Portfólio';
    return (
      <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold text-[var(--text)] mb-1">{label}</p>
        <p className="text-[var(--text-muted)]">
          Risco: <span className="text-[var(--text)] font-medium">{p.risk.toFixed(2)}%</span>
        </p>
        <p className="text-[var(--text-muted)]">
          Retorno: <span className={`font-medium ${p.annReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {p.annReturn >= 0 ? '+' : ''}{p.annReturn.toFixed(2)}%
          </span>
        </p>
        <p className="text-[var(--text-muted)]">
          Sharpe: <span className="text-[var(--text)] font-medium">{p.sharpe.toFixed(2)}</span>
        </p>
      </div>
    );
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Fronteira Eficiente
        </h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Mix de ativos com maior retorno por nível de risco (Markowitz)
        </p>
      </div>

      {/* Legend */}
      {!isEmpty && (
        <div className="flex flex-wrap gap-3 mb-3 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#6366f1] inline-block" />
            Simulações
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[var(--accent)] inline-block border-2 border-white" />
            Carteira Atual
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#22c55e] inline-block border-2 border-white" />
            Máx. Sharpe
          </span>
        </div>
      )}

      <div className="h-64">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
            Dados insuficientes para calcular a fronteira eficiente
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                dataKey="risk"
                name="Risco"
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                label={{ value: 'Risco (Vol. Anual)', position: 'insideBottom', offset: -2, fill: 'var(--text-muted)', fontSize: 10 }}
              />
              <YAxis
                type="number"
                dataKey="annReturn"
                name="Retorno"
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              />
              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
              <Tooltip content={<CustomTooltip />} />

              {/* Simulated portfolios */}
              <Scatter data={simulated} name="Simulações" opacity={0.7}>
                {simulated.map((p, i) => (
                  <Cell key={i} fill={sharpeColor(p.sharpe)} />
                ))}
              </Scatter>

              {/* Max Sharpe */}
              <Scatter data={maxSharpe} name="Máx. Sharpe" opacity={1}>
                {maxSharpe.map((_, i) => (
                  <Cell key={i} fill="#22c55e" r={8} />
                ))}
              </Scatter>

              {/* Current portfolio */}
              <Scatter data={current} name="Atual" opacity={1}>
                {current.map((_, i) => (
                  <Cell key={i} fill="var(--accent)" r={8} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
