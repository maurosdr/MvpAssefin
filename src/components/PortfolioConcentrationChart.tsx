'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PortfolioChartPosition } from '@/types/portfolio';

const CATEGORY_COLORS: Record<string, string> = {
  crypto: '#F7931A',
  stock: '#3FB950',
  etf: '#58A6FF',
  bdr: '#D2A8FF',
  fii: '#F0883E',
  prediction: '#FF6B6B',
};

const ASSET_COLORS = [
  '#F7931A', '#3FB950', '#58A6FF', '#D2A8FF', '#F0883E',
  '#FF6B6B', '#22c55e', '#8b5cf6', '#06b6d4', '#f59e0b',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

interface Props {
  positions: PortfolioChartPosition[];
}

export default function PortfolioConcentrationChart({ positions }: Props) {
  if (positions.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
          Concentração por Ativo
        </h3>
        <div className="h-64 flex items-center justify-center text-[var(--text-muted)] text-sm">
          Adicione posições para ver a concentração
        </div>
      </div>
    );
  }

  const data = positions
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((p) => ({
      name: p.symbol,
      fullName: p.name,
      value: p.value,
      type: p.type,
      weight: p.weight,
    }));

  const totalValue = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
        Concentração por Ativo
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={ASSET_COLORS[index % ASSET_COLORS.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-xs font-semibold text-[var(--text)]">
                      {d.name} - {d.fullName}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {((d.value / totalValue) * 100).toFixed(1)}% | R$ {d.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              formatter={(value: string) => (
                <span className="text-xs text-[var(--text-secondary)]">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
