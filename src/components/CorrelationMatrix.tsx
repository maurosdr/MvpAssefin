'use client';

import { useMemo } from 'react';
import { CorrelationResult, calculatePortfolioCorrelation } from '@/lib/portfolio-calculations';

interface Props {
  data: CorrelationResult;
  /** Normalized weights aligned to data.labels order */
  weights?: number[];
}

function corrToRgb(value: number): string {
  const c = Math.max(-1, Math.min(1, value));
  if (c >= 0) {
    // neutral → green
    const t = c;
    return `rgb(${Math.round(55 + (34 - 55) * t)},${Math.round(65 + (197 - 65) * t)},${Math.round(81 + (94 - 81) * t)})`;
  } else {
    // neutral → red
    const t = -c;
    return `rgb(${Math.round(55 + (239 - 55) * t)},${Math.round(65 + (68 - 65) * t)},${Math.round(81 + (68 - 81) * t)})`;
  }
}

function cellTextColor(value: number): string {
  return Math.abs(value) > 0.45 ? '#fff' : '#9ca3af';
}

function trunc(s: string, n = 6): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function corrColor(v: number): string {
  if (v >= 0.75) return 'text-red-400';
  if (v >= 0.5) return 'text-orange-400';
  if (v >= 0.2) return 'text-yellow-400';
  return 'text-green-400';
}

export default function CorrelationMatrix({ data, weights }: Props) {
  const { labels, matrix } = data;
  const n = labels.length;
  const isEmpty = n === 0;

  // Portfolio correlation metric
  const portCorr = useMemo(() => {
    if (n < 2) return null;
    const w = weights && weights.length === n ? weights : Array(n).fill(1 / n);
    return calculatePortfolioCorrelation(matrix, w);
  }, [matrix, n, weights]);

  // Cell size adapts to number of assets
  const cellPx = n <= 5 ? 48 : n <= 8 ? 38 : n <= 12 ? 30 : 24;
  const fontSize = n <= 5 ? 11 : n <= 8 ? 10 : 9;
  const headerFontSize = n <= 8 ? 10 : 9;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Correlograma
        </h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Correlação de Pearson entre retornos diários — {n} ativo{n !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Portfolio correlation metric */}
      {portCorr && (
        <div className="flex items-start gap-4 mb-4 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
          {/* Gauge circle */}
          <div className="flex flex-col items-center shrink-0">
            <div className={`text-2xl font-bold ${corrColor(portCorr.value)}`}>
              {portCorr.value.toFixed(2)}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5 text-center">Correlação<br/>Média</div>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${corrColor(portCorr.value)}`}>{portCorr.label}</p>
            {/* Diversification bar */}
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                <span>Índice de diversificação</span>
                <span className="font-medium text-[var(--text)]">{(portCorr.diversification * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${portCorr.diversification * 100}%`,
                    background: portCorr.diversification > 0.7
                      ? '#22c55e'
                      : portCorr.diversification > 0.4
                      ? '#f59e0b'
                      : '#ef4444',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {isEmpty ? (
        <div className="h-40 flex items-center justify-center text-[var(--text-muted)] text-sm">
          Dados insuficientes para calcular correlações
        </div>
      ) : (
        <>
          {/* Color scale legend */}
          <div className="flex items-center gap-2 mb-3 text-[10px] text-[var(--text-muted)]">
            <span style={{ color: '#ef4444' }}>−1</span>
            <div
              className="flex-1 h-1.5 rounded"
              style={{ background: 'linear-gradient(to right, #ef4444, #374151, #22c55e)', maxWidth: 80 }}
            />
            <span style={{ color: '#22c55e' }}>+1</span>
            <span className="ml-2 opacity-60">Hover para detalhes</span>
          </div>

          {/* Scrollable grid */}
          <div className="overflow-auto">
            <div
              className="grid gap-0.5 w-full"
              style={{
                gridTemplateColumns: `auto repeat(${n}, minmax(${cellPx}px, 1fr))`,
              }}
            >
              {/* Top-left empty */}
              <div />
              {/* Column headers */}
              {labels.map((lbl) => (
                <div
                  key={`ch-${lbl}`}
                  className="text-center font-semibold text-[var(--text-muted)] pb-1 flex items-end justify-center"
                  style={{ fontSize: headerFontSize, minHeight: cellPx + 4 }}
                  title={lbl}
                >
                  <span
                    style={{
                      writingMode: n > 6 ? 'vertical-rl' : 'horizontal-tb',
                      transform: n > 6 ? 'rotate(180deg)' : 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {trunc(lbl, n > 8 ? 5 : 7)}
                  </span>
                </div>
              ))}

              {/* Rows */}
              {labels.map((rowLbl, i) => (
                <>
                  {/* Row header */}
                  <div
                    key={`rh-${rowLbl}`}
                    className="flex items-center justify-end pr-1.5 font-semibold text-[var(--text-muted)] whitespace-nowrap"
                    style={{ fontSize: headerFontSize, minHeight: cellPx }}
                    title={rowLbl}
                  >
                    {trunc(rowLbl, n > 8 ? 5 : 7)}
                  </div>
                  {/* Cells */}
                  {labels.map((colLbl, j) => {
                    const val = matrix[i]?.[j] ?? 0;
                    return (
                      <div
                        key={`${rowLbl}-${colLbl}`}
                        className="rounded flex items-center justify-center font-semibold cursor-default transition-transform hover:scale-110 hover:z-10 relative hover:shadow-lg"
                        style={{
                          backgroundColor: corrToRgb(val),
                          color: cellTextColor(val),
                          fontSize,
                          aspectRatio: '1',
                          minWidth: cellPx,
                          minHeight: cellPx,
                        }}
                        title={`${rowLbl} × ${colLbl}: ${val.toFixed(3)}`}
                      >
                        {n <= 10 ? val.toFixed(2) : val.toFixed(1)}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
