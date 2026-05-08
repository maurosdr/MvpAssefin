'use client';

import { useState } from 'react';
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
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { EfficientFrontierPoint, BlackLittermanAllocation } from '@/lib/portfolio-calculations';

interface Props {
  points: EfficientFrontierPoint[];
  blAllocation?: BlackLittermanAllocation;
}

type Model = 'markowitz' | 'blacklitterman';

function sharpeColor(sharpe: number): string {
  if (sharpe < 0) return '#ef4444';
  if (sharpe < 1) return '#f59e0b';
  return '#22c55e';
}

export default function EfficientFrontierChart({ points, blAllocation }: Props) {
  const [model, setModel] = useState<Model>('markowitz');
  const [selectedPoint, setSelectedPoint] = useState<EfficientFrontierPoint | null>(null);

  const simulated = points.filter((p) => !p.isCurrent && !p.isMaxSharpe);
  const current = points.filter((p) => p.isCurrent);
  const maxSharpe = points.filter((p) => p.isMaxSharpe);

  const isEmpty = points.length === 0;

  const handleClick = (data: unknown) => {
    const p = data as EfficientFrontierPoint;
    if (p && typeof p.risk === 'number') setSelectedPoint(p);
  };

  // ── Markowitz tooltip ──────────────────────────────────────────────────────
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
        <p className="text-[var(--text-muted)]">Risco: <span className="text-[var(--text)] font-medium">{p.risk.toFixed(2)}%</span></p>
        <p className="text-[var(--text-muted)]">Retorno: <span className={`font-medium ${p.annReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>{p.annReturn >= 0 ? '+' : ''}{p.annReturn.toFixed(2)}%</span></p>
        <p className="text-[var(--text-muted)]">Sharpe: <span className="text-[var(--text)] font-medium">{p.sharpe.toFixed(2)}</span></p>
        <p className="text-[var(--text-muted)] mt-1 italic">Clique para ver alocação</p>
      </div>
    );
  };

  // ── Allocation popup ───────────────────────────────────────────────────────
  const popupLabel = selectedPoint?.isCurrent ? '⭐ Carteira Atual'
    : selectedPoint?.isMaxSharpe ? '🏆 Maior Sharpe'
    : 'Portfólio Simulado';

  const allocationEntries = selectedPoint?.weights
    ? Object.entries(selectedPoint.weights).sort((a, b) => b[1] - a[1])
    : [];

  // ── BL bar chart data ──────────────────────────────────────────────────────
  const blBarData = blAllocation
    ? Object.keys(blAllocation.bl).map((sym) => ({
        symbol: sym.length > 7 ? sym.slice(0, 6) + '…' : sym,
        fullSymbol: sym,
        'BL Ótimo':    +((blAllocation.bl[sym] ?? 0) * 100).toFixed(1),
        'Máx. Sharpe': +((blAllocation.maxSharpe[sym] ?? 0) * 100).toFixed(1),
        'Atual':       +((blAllocation.current[sym] ?? 0) * 100).toFixed(1),
      }))
    : [];

  const subtitle = model === 'markowitz'
    ? 'Simulações de Monte Carlo — mix com maior retorno por risco'
    : 'Black-Litterman — alocação ótima com retornos de equilíbrio';

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Alocação de Portfolio
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
        </div>
        {/* Model toggle */}
        <div className="flex shrink-0 rounded-lg overflow-hidden border border-[var(--border)] text-xs font-medium">
          <button
            onClick={() => setModel('markowitz')}
            className={`px-3 py-1.5 transition-colors ${
              model === 'markowitz'
                ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            Markowitz
          </button>
          <button
            onClick={() => setModel('blacklitterman')}
            className={`px-3 py-1.5 transition-colors border-l border-[var(--border)] ${
              model === 'blacklitterman'
                ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            Black-Litterman
          </button>
        </div>
      </div>

      {/* ── Markowitz mode ── */}
      {model === 'markowitz' && (
        <>
          {!isEmpty && (
            <div className="flex flex-wrap gap-3 mb-3 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#6366f1] inline-block" />Simulações
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[var(--accent)] inline-block border-2 border-white" />Carteira Atual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#22c55e] inline-block border-2 border-white" />Máx. Sharpe
              </span>
            </div>
          )}

          <div className="h-64 relative">
            {isEmpty ? (
              <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
                Dados insuficientes para calcular a fronteira eficiente
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" dataKey="risk" name="Risco"
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                      label={{ value: 'Risco (Vol. Anual)', position: 'insideBottom', offset: -2, fill: 'var(--text-muted)', fontSize: 10 }}
                    />
                    <YAxis type="number" dataKey="annReturn" name="Retorno"
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                    />
                    <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
                    <Tooltip content={<CustomTooltip />} />

                    <Scatter data={simulated} name="Simulações" opacity={0.7} onClick={handleClick} style={{ cursor: 'pointer' }}>
                      {simulated.map((p, i) => <Cell key={i} fill={sharpeColor(p.sharpe)} />)}
                    </Scatter>
                    <Scatter data={maxSharpe} name="Máx. Sharpe" opacity={1} onClick={handleClick} style={{ cursor: 'pointer' }}>
                      {maxSharpe.map((_, i) => <Cell key={i} fill="#22c55e" r={8} />)}
                    </Scatter>
                    <Scatter data={current} name="Atual" opacity={1} onClick={handleClick} style={{ cursor: 'pointer' }}>
                      {current.map((_, i) => <Cell key={i} fill="var(--accent)" r={8} />)}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>

                {/* Allocation popup */}
                {selectedPoint && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center p-3"
                    style={{ background: 'rgba(0,0,0,0.45)' }}
                    onClick={() => setSelectedPoint(null)}
                  >
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-2xl w-full max-w-[240px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-[var(--text)]">{popupLabel}</p>
                        <button onClick={() => setSelectedPoint(null)} className="text-[var(--text-muted)] hover:text-[var(--text)] text-sm px-1">✕</button>
                      </div>
                      <div className="flex gap-3 mb-3 text-[10px]">
                        <div className="flex-1 text-center">
                          <div className="text-[var(--text-muted)]">Risco</div>
                          <div className="font-semibold text-[var(--text)]">{selectedPoint.risk.toFixed(1)}%</div>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="text-[var(--text-muted)]">Retorno</div>
                          <div className={`font-semibold ${selectedPoint.annReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {selectedPoint.annReturn >= 0 ? '+' : ''}{selectedPoint.annReturn.toFixed(1)}%
                          </div>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="text-[var(--text-muted)]">Sharpe</div>
                          <div className="font-semibold" style={{ color: sharpeColor(selectedPoint.sharpe) }}>{selectedPoint.sharpe.toFixed(2)}</div>
                        </div>
                      </div>
                      {allocationEntries.length > 0 && (
                        <>
                          <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Alocação</div>
                          <div className="space-y-1.5">
                            {allocationEntries.map(([sym, w]) => (
                              <div key={sym}>
                                <div className="flex justify-between text-[10px] mb-0.5">
                                  <span className="text-[var(--text)] font-medium truncate max-w-[120px]">{sym}</span>
                                  <span className="text-[var(--text-muted)] ml-2">{(w * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${w * 100}%`, background: 'var(--accent)' }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Black-Litterman mode ── */}
      {model === 'blacklitterman' && (
        <div className="h-64">
          {!blAllocation ? (
            <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
              Dados insuficientes para o modelo Black-Litterman
            </div>
          ) : blBarData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
              Nenhum ativo disponível
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={blBarData} margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  domain={[0, 100]}
                />
                <YAxis
                  type="category"
                  dataKey="symbol"
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  width={58}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="BL Ótimo"    fill="#6366f1" radius={[0, 3, 3, 0]} maxBarSize={16} />
                <Bar dataKey="Máx. Sharpe" fill="#22c55e" radius={[0, 3, 3, 0]} maxBarSize={16} />
                <Bar dataKey="Atual"       fill="var(--accent)" radius={[0, 3, 3, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
