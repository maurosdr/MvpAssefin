'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PortfolioHistoryPoint } from '@/types/portfolio';

interface Props {
  data: PortfolioHistoryPoint[];
}

export default function PortfolioVolatilityChart({ data }: Props) {
  // Filter out initial zero-volatility points
  const filtered = data.filter((d) => d.volatility > 0);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
        Volatilidade Diária do Portfolio
      </h3>
      <div className="h-64">
        {filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
            Ative o backtest para visualizar a volatilidade
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filtered}>
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
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload as PortfolioHistoryPoint;
                  return (
                    <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg">
                      <p className="text-xs text-[var(--text-muted)]">{d.date}</p>
                      <p className="text-sm font-semibold text-[var(--accent)]">
                        Vol: {d.volatility.toFixed(2)}%
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="volatility"
                fill="var(--accent)"
                opacity={0.7}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
