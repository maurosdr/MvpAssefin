'use client';

import { usePortfolio } from '@/context/PortfolioContext';

export default function PortfolioPositionsTable() {
  const { summary } = usePortfolio();

  const assets = summary?.assets || [];

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Positions ({assets.length})
        </h2>
      </div>

      {assets.length === 0 ? (
        <div className="p-8 text-center text-[var(--text-muted)] text-sm">
          No positions to display. Connect an exchange to see your holdings.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3">Asset</th>
                <th className="text-right px-6 py-3">Quantity</th>
                <th className="text-right px-6 py-3">Price</th>
                <th className="text-right px-6 py-3">Value</th>
                <th className="text-right px-6 py-3">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.symbol} className="border-t border-[var(--border)]/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text)] font-medium text-sm">{asset.symbol}</span>
                      <span className="text-[10px] text-[var(--text-muted)] bg-gray-800 px-1.5 py-0.5 rounded">
                        {asset.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right text-[var(--text)] font-mono text-sm">
                    {asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </td>
                  <td className="px-6 py-3 text-right text-[var(--text-muted)] font-mono text-sm">
                    ${asset.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 text-right text-[var(--text)] font-mono text-sm font-medium">
                    ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, asset.allocation)}%` }}
                        />
                      </div>
                      <span className="text-[var(--text-muted)] font-mono text-xs w-12 text-right">
                        {asset.allocation.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
