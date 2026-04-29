'use client';

import { PortfolioChartPosition } from '@/types/portfolio';

const CATEGORY_LABELS: Record<string, string> = {
  crypto: 'Crypto',
  stock: 'Ação',
  etf: 'ETF',
  bdr: 'BDR',
  fii: 'FII',
  prediction: 'Prediction',
};

const CATEGORY_COLORS: Record<string, string> = {
  crypto: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  stock: 'bg-green-500/20 text-green-400 border-green-500/30',
  etf: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  bdr: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  fii: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  prediction: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface Props {
  positions: PortfolioChartPosition[];
  onRemove?: (symbol: string, type: string) => void;
}

export default function PortfolioPositionsTable({ positions, onRemove }: Props) {
  if (positions.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
          Posições
        </h3>
        <div className="text-center py-8 text-[var(--text-muted)] text-sm">
          Nenhuma posição adicionada. Conecte uma exchange ou adicione posições manualmente.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
        Posições ({positions.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-3 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase">
                Ativo
              </th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase">
                Tipo
              </th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase hidden sm:table-cell">
                Data Entrada
              </th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase hidden md:table-cell">
                Preço Entrada
              </th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase">
                Preço Atual
              </th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase">
                Rent. %
              </th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase">
                Valor
              </th>
              {onRemove && (
                <th className="text-right py-3 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase w-12">
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {positions.map((pos, i) => {
              const returnPct = pos.returnPct ?? (
                pos.entryPrice && pos.currentPrice
                  ? ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100
                  : undefined
              );

              return (
                <tr
                  key={`${pos.symbol}-${pos.type}-${i}`}
                  className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <td className="py-3 px-2">
                    <div>
                      <span className="font-semibold text-[var(--text)]">
                        {pos.symbol}
                      </span>
                      <span className="text-[var(--text-muted)] ml-1.5 text-xs hidden lg:inline">
                        {pos.name}
                      </span>
                      {pos.side && (
                        <span className={`ml-1.5 text-xs font-medium ${
                          pos.side === 'YES' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {pos.side}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
                        CATEGORY_COLORS[pos.type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}
                    >
                      {CATEGORY_LABELS[pos.type] || pos.type}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right text-[var(--text-secondary)] hidden sm:table-cell">
                    {pos.entryDate
                      ? new Date(pos.entryDate).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="py-3 px-2 text-right text-[var(--text-secondary)] hidden md:table-cell">
                    {pos.entryPrice !== undefined
                      ? pos.type === 'prediction'
                        ? `$${pos.entryPrice.toFixed(2)}`
                        : `R$ ${pos.entryPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-[var(--text)]">
                    {pos.currentPrice !== undefined
                      ? pos.type === 'prediction' || pos.type === 'crypto'
                        ? `$${pos.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : `R$ ${pos.currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td className="py-3 px-2 text-right">
                    {returnPct !== undefined ? (
                      <span
                        className={`font-semibold ${
                          returnPct >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {returnPct >= 0 ? '+' : ''}
                        {returnPct.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-[var(--text)]">
                    {pos.value > 0
                      ? pos.type === 'prediction' || pos.type === 'crypto'
                        ? `$${pos.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : `R$ ${pos.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  {onRemove && (
                    <td className="py-3 px-2 text-right">
                      {pos.type !== 'crypto' && (
                        <button
                          onClick={() => onRemove(pos.symbol, pos.type)}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1"
                          title="Remover posição"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
