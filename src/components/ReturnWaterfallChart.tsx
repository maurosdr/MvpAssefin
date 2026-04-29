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
  payload?: { payload: WaterfallItem & { absValue: number; base: number } }[];
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
        <>
          <p className="text-[var(--text-muted)]">
            Contribuição:{' '}
            <span className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{item.value.toFixed(3)}%
            </span>
          </p>
          <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
            Acumulado após: {(item.start + item.value).toFixed(2)}%
          </p>
        </>
      )}
    </div>
  );
};

const BAR_WIDTH = 60;
const MIN_CHART_WIDTH = 300;

export default function ReturnWaterfallChart({ items }: Props) {
  const isEmpty = items.length === 0;

  const chartData = items.map((item) => ({
    ...item,
    base: item.isTotal ? 0 : item.value >= 0 ? item.start : item.start + item.value,
    absValue: Math.abs(item.value),
  }));

  const allEnds = items.map((i) => i.start + i.value);
  const allStarts = items.map((i) => i.start);
  const rawMin = Math.min(0, ...allEnds, ...allStarts);
  const rawMax = Math.max(0, ...allEnds, ...allStarts);
  const pad = (rawMax - rawMin) * 0.12 || 1;
  const domainMin = rawMin - pad;
  const domainMax = rawMax + pad;

  // Number of bars = assets + 1 (total)
  const barCount = items.length;
  const chartWidth = Math.max(MIN_CHART_WIDTH, barCount * BAR_WIDTH);
  const needsScroll = barCount > 8;

  const chart = (
    <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 24, left: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
      <XAxis
        dataKey="name"
        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
        interval={0}
        tickFormatter={(v: string) => (v.length > 7 ? v.slice(0, 6) + '…' : v)}
        angle={barCount > 8 ? -35 : 0}
        textAnchor={barCount > 8 ? 'end' : 'middle'}
      />
      <YAxis
        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
        tickFormatter={(v: number) => `${v.toFixed(1)}%`}
        domain={[domainMin, domainMax]}
        width={45}
      />
      <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
      <Tooltip content={<CustomTooltip />} />

      {/* Transparent base spacer — creates the floating effect */}
      <Bar dataKey="base" stackId="wf" fill="transparent" legendType="none" />

      {/* Colored value bar */}
      <Bar dataKey="absValue" stackId="wf" radius={[3, 3, 0, 0]}>
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
  );

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Waterfall de Retorno
        </h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Contribuição de cada ativo ao retorno total · {items.length > 1 ? `${items.length - 1} ativo${items.length - 1 !== 1 ? 's' : ''}` : ''}
        </p>
      </div>

      {/* Legend */}
      {!isEmpty && (
        <div className="flex gap-4 mb-3 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />
            Positivo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />
            Negativo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#ffcc02] inline-block" />
            Total
          </span>
        </div>
      )}

      <div className="h-72">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
            Dados insuficientes para o waterfall de retorno
          </div>
        ) : needsScroll ? (
          <div className="h-full overflow-x-auto">
            <div style={{ width: chartWidth, height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                {chart}
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chart}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
