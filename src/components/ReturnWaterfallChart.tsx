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
  Cell,
} from 'recharts';
import { WaterfallItem } from '@/lib/portfolio-calculations';

interface Props {
  items: WaterfallItem[];
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: WaterfallItem }[];
}) => {
  if (!active || !payload?.[0]) return null;
  const item = payload[0].payload;
  const isPositive = item.value >= 0;
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-[var(--text)] mb-1">{item.name}</p>
      {item.isTotal ? (
        <p className="text-[var(--text-muted)]">
          Retorno Total:{' '}
          <span className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{item.value.toFixed(2)}%
          </span>
        </p>
      ) : (
        <p className="text-[var(--text-muted)]">
          Contribuição:{' '}
          <span className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{item.value.toFixed(2)}%
          </span>
        </p>
      )}
    </div>
  );
};

export default function ReturnWaterfallChart({ items }: Props) {
  const isEmpty = items.length === 0;

  // Build chart data: two stacked bars per item — transparent "base" + colored "value"
  const chartData = items.map((item) => ({
    ...item,
    base: item.isTotal ? 0 : item.value >= 0 ? item.start : item.start + item.value,
    absValue: Math.abs(item.value),
  }));

  const allValues = items.map((i) => i.start + i.value);
  const domainMin = Math.min(0, ...allValues, ...items.map((i) => i.start)) * 1.1;
  const domainMax = Math.max(0, ...allValues, ...items.map((i) => i.start)) * 1.1;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Waterfall de Retorno
        </h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Contribuição de cada ativo ao retorno total da carteira
        </p>
      </div>

      <div className="h-64">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
            Dados insuficientes para o waterfall de retorno
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                interval={0}
                tickFormatter={(v: string) => (v.length > 6 ? v.slice(0, 5) + '…' : v)}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                domain={[domainMin, domainMax]}
              />
              <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
              <Tooltip content={<CustomTooltip />} />

              {/* Transparent base bar for floating effect */}
              <Bar dataKey="base" stackId="waterfall" fill="transparent" />

              {/* Colored value bar */}
              <Bar dataKey="absValue" stackId="waterfall" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, i) => {
                  let fill: string;
                  if (entry.isTotal) {
                    fill = entry.value >= 0 ? '#ffcc02' : '#f59e0b';
                  } else {
                    fill = entry.value >= 0 ? '#22c55e' : '#ef4444';
                  }
                  return <Cell key={i} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
