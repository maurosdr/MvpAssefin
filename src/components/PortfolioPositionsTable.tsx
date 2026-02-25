'use client';

import { usePortfolio } from '@/context/PortfolioContext';
import { type ManualAsset } from '@/components/AddAssetModal';

const TYPE_COLOR: Record<string, string> = {
  crypto: 'text-yellow-400 bg-yellow-400/10',
  stock: 'text-blue-400 bg-blue-400/10',
  etf: 'text-purple-400 bg-purple-400/10',
  'fixed-income': 'text-green-400 bg-green-400/10',
};

const TYPE_LABEL: Record<string, string> = {
  crypto: 'Crypto',
  stock: 'Ação',
  etf: 'ETF/FII',
  'fixed-income': 'Renda Fixa',
};

interface Props {
  manualAssets?: ManualAsset[];
  onEdit?: (asset: ManualAsset) => void;
  onDelete?: (id: string) => void;
  onAddFirst?: () => void;
}

export default function PortfolioPositionsTable({
  manualAssets = [],
  onEdit,
  onDelete,
  onAddFirst,
}: Props) {
  const { summary } = usePortfolio();

  const exchangeAssets = summary?.assets || [];

  const totalValue =
    exchangeAssets.reduce((s, a) => s + a.value, 0) +
    manualAssets.reduce((s, a) => s + a.quantity * a.avgPrice, 0);

  const hasAny = exchangeAssets.length > 0 || manualAssets.length > 0;

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Posições ({exchangeAssets.length + manualAssets.length})
        </h2>
        {manualAssets.length > 0 && (
          <span className="text-xs text-[var(--text-muted)] bg-gray-800 px-2 py-1 rounded-full border border-gray-700">
            {manualAssets.length} manual{manualAssets.length > 1 ? 'is' : ''}
          </span>
        )}
      </div>

      {!hasAny ? (
        <div className="p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-[var(--text)] font-semibold mb-1">Nenhuma posição encontrada</p>
          <p className="text-[var(--text-muted)] text-sm mb-5">
            Conecte uma exchange ou adicione ativos manualmente para visualizar seu portfólio.
          </p>
          {onAddFirst && (
            <button
              onClick={onAddFirst}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-hover)] transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar primeiro ativo
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3">Ativo</th>
                <th className="text-right px-6 py-3">Quantidade</th>
                <th className="text-right px-6 py-3">Preço Médio</th>
                <th className="text-right px-6 py-3">Valor</th>
                <th className="text-right px-6 py-3">Alocação</th>
                <th className="w-16 px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {/* Ativos de exchanges */}
              {exchangeAssets.map((asset) => {
                const allocation = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
                return (
                  <tr key={`ex-${asset.symbol}`} className="border-t border-[var(--border)]/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text)] font-medium text-sm">{asset.symbol}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLOR[asset.type] || 'text-gray-400 bg-gray-800'}`}>
                          {TYPE_LABEL[asset.type] || asset.type}
                        </span>
                        <span className="text-[10px] text-gray-500 bg-gray-800/60 px-1.5 py-0.5 rounded border border-gray-700/60">Exchange</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right text-[var(--text)] font-mono text-sm">
                      {asset.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}
                    </td>
                    <td className="px-6 py-3 text-right text-[var(--text-muted)] font-mono text-sm">
                      {asset.currentPrice > 0
                        ? `$${asset.currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="px-6 py-3 text-right text-[var(--text)] font-mono text-sm font-medium">
                      ${asset.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, allocation)}%` }} />
                        </div>
                        <span className="text-[var(--text-muted)] font-mono text-xs w-12 text-right">
                          {allocation.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 w-16" />
                  </tr>
                );
              })}

              {/* Ativos manuais */}
              {manualAssets.map((asset) => {
                const value = asset.quantity * asset.avgPrice;
                const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;
                return (
                  <tr key={asset.id} className="border-t border-[var(--border)]/50 hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[var(--text)] font-medium text-sm">{asset.symbol}</span>
                        {asset.name && asset.name !== asset.symbol && (
                          <span className="text-xs text-[var(--text-muted)]">{asset.name}</span>
                        )}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLOR[asset.type] || 'text-gray-400 bg-gray-800'}`}>
                          {TYPE_LABEL[asset.type] || asset.type}
                        </span>
                        <span className="text-[10px] text-[var(--accent)] bg-[var(--accent-soft)] px-1.5 py-0.5 rounded border border-[var(--accent)]/20">Manual</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right text-[var(--text)] font-mono text-sm">
                      {asset.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 8 })}
                    </td>
                    <td className="px-6 py-3 text-right text-[var(--text-muted)] font-mono text-sm">
                      {asset.type === 'crypto' ? '$' : 'R$'}
                      {asset.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-right text-[var(--text)] font-mono text-sm font-medium">
                      {asset.type === 'crypto' ? '$' : 'R$'}
                      {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${Math.min(100, allocation)}%` }} />
                        </div>
                        <span className="text-[var(--text-muted)] font-mono text-xs w-12 text-right">
                          {allocation.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 w-16">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(asset)}
                            title="Editar"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[var(--accent)] hover:bg-gray-800 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(asset.id)}
                            title="Excluir"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
