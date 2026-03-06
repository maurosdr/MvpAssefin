'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Cell,
} from 'recharts';
import { BrinsonItem } from '@/lib/portfolio-calculations';

interface Props {
  data: BrinsonItem[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg text-xs min-w-[180px]">
      <p className="font-semibold text-[var(--text)] mb-1.5">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="flex justify-between gap-4">
          <span>{entry.name}:</span>
          <span className="font-medium">
            {entry.value >= 0 ? '+' : ''}{entry.value.toFixed(2)}%
          </span>
        </p>
      ))}
      <div className="mt-1.5 pt-1.5 border-t border-[var(--border)] text-[var(--text-muted)] text-[10px] leading-relaxed">
        <p><strong>Alocação:</strong> priorizar setores que superaram o benchmark</p>
        <p><strong>Seleção:</strong> escolher ativos dentro do setor</p>
      </div>
    </div>
  );
};

export default function BrinsonAttributionChart({ data }: Props) {
  const isEmpty = data.length === 0;

  // Recharts needs plain objects — map for display
  const chartData = data.map((d) => ({
    ...d,
    allocationEffect: parseFloat((d.allocationEffect * 100).toFixed(3)),
    selectionEffect: parseFloat((d.selectionEffect * 100).toFixed(3)),
    total: parseFloat((d.total).toFixed(3)),
  }));

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Atribuição de Performance (Brinson)
        </h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Stock picking vs. alocação setorial vs. contribuição total
        </p>
      </div>

      <div className="h-64">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
            Dados insuficientes para atribuição de performance
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="symbol"
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                interval={0}
                tickFormatter={(v: string) => (v.length > 6 ? v.slice(0, 5) + '…' : v)}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              />
              <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }}
                formatter={(v) =>
                  v === 'allocationEffect'
                    ? 'Efeito Alocação'
                    : v === 'selectionEffect'
                    ? 'Efeito Seleção'
                    : 'Contribuição Total'
                }
              />
              <Bar dataKey="allocationEffect" name="allocationEffect" fill="#6366f1" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.allocationEffect >= 0 ? '#6366f1' : '#818cf8'}
                  />
                ))}
              </Bar>
              <Bar dataKey="selectionEffect" name="selectionEffect" fill="#a855f7" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.selectionEffect >= 0 ? '#a855f7' : '#c084fc'}
                  />
                ))}
              </Bar>
              <Bar dataKey="total" name="total" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.total >= 0 ? '#ffcc02' : '#f59e0b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
