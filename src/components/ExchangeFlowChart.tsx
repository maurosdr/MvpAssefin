'use client';

import { useEffect, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

interface ExchangeFlowData {
  date: string;
  financeiro: number;
  comercial: number;
  total: number;
}

export default function ExchangeFlowChart() {
  const [data, setData] = useState<ExchangeFlowData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/market/exchange-flow')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="modern-card p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) return null;

  // Compute summary
  const totalFinanceiro = data.reduce((sum, d) => sum + d.financeiro, 0);
  const totalComercial = data.reduce((sum, d) => sum + d.comercial, 0);
  const totalFlow = totalFinanceiro + totalComercial;

  const formatValue = (v: number) => {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}B`;
    return `${v}M`;
  };

  return (
    <div className="modern-card">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
          <div>
            <h3 className="section-title">Fluxo Cambial Estrangeiro</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Fonte: Banco Central do Brasil (SGS) &bull; USD milhoes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[var(--accent)]" />
            <span className="text-[10px] text-[var(--text-muted)]">Financeiro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[var(--info)]" />
            <span className="text-[10px] text-[var(--text-muted)]">Comercial</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)]">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Financeiro (Periodo)</span>
          <p className={`text-lg font-bold data-value mt-1 ${totalFinanceiro >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {totalFinanceiro >= 0 ? '+' : ''}{formatValue(totalFinanceiro)}
          </p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)]">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Comercial (Periodo)</span>
          <p className={`text-lg font-bold data-value mt-1 ${totalComercial >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {totalComercial >= 0 ? '+' : ''}{formatValue(totalComercial)}
          </p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)]">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Total (Periodo)</span>
          <p className={`text-lg font-bold data-value mt-1 ${totalFlow >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {totalFlow >= 0 ? '+' : ''}{formatValue(totalFlow)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[320px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0b0f19',
                border: '1px solid #1f2937',
                borderRadius: '0.75rem',
                fontSize: '0.75rem',
              }}
              formatter={(value, name) => {
                const v = Number(value) || 0;
                const label = name === 'financeiro' ? 'Financeiro' : name === 'comercial' ? 'Comercial' : 'Total';
                return [`USD ${v.toLocaleString('pt-BR')}M`, label];
              }}
            />
            <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
            <Bar dataKey="financeiro" radius={[3, 3, 0, 0]} maxBarSize={24}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.financeiro >= 0 ? '#22c55e' : '#f85149'}
                  fillOpacity={0.7}
                />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="comercial"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6' }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
