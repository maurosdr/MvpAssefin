'use client';

import { useMemo } from 'react';
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
import { VaRResult } from '@/lib/portfolio-calculations';

interface Props {
  data: VaRResult;
}

function MetricTile({
  label,
  value,
  sub,
  color,
  tooltip,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  tooltip: string;
}) {
  return (
    <div
      className="flex-1 min-w-0 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] cursor-default"
      title={tooltip}
    >
      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1 truncate">
        {label}
      </p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function VaRCard({ data }: Props) {
  // Build histogram buckets
  const { buckets, varLine95, varLine99 } = useMemo(() => {
    const returns = data.portReturns;
    if (returns.length === 0) return { buckets: [], varLine95: 0, varLine99: 0 };

    const min = Math.min(...returns);
    const max = Math.max(...returns);
    const N = 35;
    const width = (max - min) / N || 0.01;

    const counts: { mid: number; count: number }[] = Array.from({ length: N }, (_, i) => ({
      mid: +(min + (i + 0.5) * width).toFixed(3),
      count: 0,
    }));

    for (const r of returns) {
      const idx = Math.min(N - 1, Math.floor((r - min) / width));
      counts[idx].count++;
    }

    return {
      buckets: counts,
      varLine95: -data.historical95,
      varLine99: -data.historical99,
    };
  }, [data]);

  // Contributions bar data (top 8)
  const contribData = useMemo(
    () =>
      data.contributions.slice(0, 8).map((c) => ({
        symbol: c.symbol.length > 8 ? c.symbol.slice(0, 7) + '…' : c.symbol,
        contrib: +c.varContrib.toFixed(3),
        weight: +(c.weight * 100).toFixed(1),
      })),
    [data.contributions]
  );

  const varColor = (v: number) =>
    v > 5 ? 'text-red-400' : v > 2 ? 'text-orange-400' : 'text-yellow-400';

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Value at Risk (VaR)
        </h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Perda máxima esperada do portfólio — horizonte 1 dia e 10 dias
        </p>
      </div>

      {/* Metric tiles */}
      <div className="flex flex-wrap gap-2 mb-5">
        <MetricTile
          label="Hist. 95% · 1d"
          value={`−${data.historical95.toFixed(2)}%`}
          sub={`10d: −${data.tenDay95.toFixed(2)}%`}
          color={varColor(data.historical95)}
          tooltip="VaR Histórico 95%: com 95% de confiança a perda diária não excederá este valor"
        />
        <MetricTile
          label="Hist. 99% · 1d"
          value={`−${data.historical99.toFixed(2)}%`}
          sub={`10d: −${data.tenDay99.toFixed(2)}%`}
          color={varColor(data.historical99)}
          tooltip="VaR Histórico 99%: com 99% de confiança a perda diária não excederá este valor"
        />
        <MetricTile
          label="Param. 95% · 1d"
          value={`−${data.parametric95.toFixed(2)}%`}
          color={varColor(data.parametric95)}
          tooltip="VaR Paramétrico (delta-normal) 95%: assume distribuição normal dos retornos"
        />
        <MetricTile
          label="CVaR · 95%"
          value={`−${data.cvar95.toFixed(2)}%`}
          sub="Expected Shortfall"
          color="text-red-400"
          tooltip="CVaR / Expected Shortfall 95%: perda média nos 5% piores dias"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Histogram */}
        <div>
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Distribuição de Retornos Diários
          </p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barCategoryGap={1}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="mid"
                  tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
                  tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} width={24} />
                <Tooltip
                  formatter={(v: number) => [v, 'Dias']}
                  labelFormatter={(l: number) => `Retorno: ${l > 0 ? '+' : ''}${l.toFixed(2)}%`}
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <ReferenceLine
                  x={varLine95}
                  stroke="#f59e0b"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{ value: 'VaR 95%', position: 'top', fill: '#f59e0b', fontSize: 9 }}
                />
                <ReferenceLine
                  x={varLine99}
                  stroke="#ef4444"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{ value: 'VaR 99%', position: 'top', fill: '#ef4444', fontSize: 9 }}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={20}>
                  {buckets.map((b, i) => (
                    <Cell
                      key={i}
                      fill={
                        b.mid <= varLine99
                          ? '#ef4444'
                          : b.mid <= varLine95
                          ? '#f59e0b'
                          : '#6366f1'
                      }
                      fillOpacity={b.mid <= varLine95 ? 1 : 0.65}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex gap-3 mt-1 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#ef4444] inline-block" />Cauda 99%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#f59e0b] inline-block" />Cauda 95%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#6366f1] inline-block opacity-65" />Normal</span>
          </div>
        </div>

        {/* Per-asset contribution */}
        <div>
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Contribuição ao VaR 95% por Ativo
          </p>
          <div className="h-44">
            {contribData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={contribData}
                  margin={{ top: 4, right: 28, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
                    tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="symbol"
                    tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
                    width={52}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      `${v.toFixed(3)}%`,
                      name === 'contrib' ? 'Contribuição VaR' : 'Peso',
                    ]}
                    contentStyle={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="contrib" radius={[0, 3, 3, 0]} maxBarSize={18}>
                    {contribData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          d.contrib > data.historical95 * 0.3
                            ? '#ef4444'
                            : d.contrib > data.historical95 * 0.1
                            ? '#f59e0b'
                            : '#6366f1'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-xs">
                Sem dados de contribuição
              </div>
            )}
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 opacity-70">
            Perda média de cada ativo nos dias em que o portfólio ultrapassou o VaR 95%
          </p>
        </div>
      </div>
    </div>
  );
}
