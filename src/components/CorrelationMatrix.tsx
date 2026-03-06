'use client';

import { CorrelationResult } from '@/lib/portfolio-calculations';

interface Props {
  data: CorrelationResult;
}

function corrColor(value: number): string {
  // Interpolate: -1 → red, 0 → neutral, +1 → green
  // Use HSL: red=0, green=142
  const clamped = Math.max(-1, Math.min(1, value));
  if (clamped >= 0) {
    // 0 → neutral (#374151 bg approx), 1 → green
    const t = clamped;
    const r = Math.round(55 + (34 - 55) * t);
    const g = Math.round(65 + (197 - 65) * t);
    const b = Math.round(81 + (94 - 81) * t);
    return `rgb(${r},${g},${b})`;
  } else {
    // 0 → neutral, -1 → red
    const t = -clamped;
    const r = Math.round(55 + (239 - 55) * t);
    const g = Math.round(65 + (68 - 65) * t);
    const b = Math.round(81 + (68 - 81) * t);
    return `rgb(${r},${g},${b})`;
  }
}

function textColor(value: number): string {
  return Math.abs(value) > 0.5 ? '#ffffff' : 'var(--text-muted)';
}

function truncLabel(s: string): string {
  return s.length > 7 ? s.slice(0, 6) + '…' : s;
}

export default function CorrelationMatrix({ data }: Props) {
  const { labels, matrix } = data;
  const isEmpty = labels.length === 0;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Correlograma
        </h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Correlação de Pearson entre os retornos diários dos ativos
        </p>
      </div>

      {isEmpty ? (
        <div className="h-64 flex items-center justify-center text-[var(--text-muted)] text-sm">
          Dados insuficientes para calcular correlações
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Color legend */}
          <div className="flex items-center gap-2 mb-3 text-xs text-[var(--text-muted)]">
            <span style={{ color: '#ef4444' }}>■ −1</span>
            <div
              className="flex-1 h-2 rounded"
              style={{
                background: 'linear-gradient(to right, #ef4444, #374151, #22c55e)',
                maxWidth: 80,
              }}
            />
            <span style={{ color: '#22c55e' }}>+1 ■</span>
          </div>

          <div
            className="inline-grid gap-0.5"
            style={{
              gridTemplateColumns: `auto repeat(${labels.length}, minmax(36px, 1fr))`,
            }}
          >
            {/* Top-left empty cell */}
            <div />
            {/* Column headers */}
            {labels.map((label) => (
              <div
                key={label}
                className="text-center text-[10px] font-semibold text-[var(--text-muted)] px-0.5 pb-1"
                title={label}
              >
                {truncLabel(label)}
              </div>
            ))}

            {/* Rows */}
            {labels.map((rowLabel, i) => (
              <>
                {/* Row header */}
                <div
                  key={`row-${rowLabel}`}
                  className="text-right text-[10px] font-semibold text-[var(--text-muted)] pr-1.5 flex items-center justify-end"
                  title={rowLabel}
                >
                  {truncLabel(rowLabel)}
                </div>

                {/* Cells */}
                {labels.map((colLabel, j) => {
                  const val = matrix[i]?.[j] ?? 0;
                  const bg = corrColor(val);
                  const fg = textColor(val);
                  return (
                    <div
                      key={`${rowLabel}-${colLabel}`}
                      className="rounded text-center text-[10px] font-semibold py-1 cursor-default transition-transform hover:scale-110 hover:z-10 relative"
                      style={{ backgroundColor: bg, color: fg, minWidth: 36, minHeight: 30 }}
                      title={`${rowLabel} × ${colLabel}: ${val.toFixed(3)}`}
                    >
                      {val.toFixed(2)}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
