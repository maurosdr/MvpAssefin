'use client';

import React, { useEffect, useState } from 'react';
import { useExchange } from '@/context/ExchangeContext';

const EXCHANGE_COLORS: Record<string, string> = {
  binance: 'bg-yellow-500/20 text-[var(--accent)] border-[var(--accent)]/30',
  coinbase: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const EXCHANGE_LABELS: Record<string, string> = {
  binance: 'Binance',
  coinbase: 'Coinbase',
};

export default function BinancePortfolio() {
  const {
    exchanges,
    connectedExchanges,
    allTotalValue,
    book,
    refreshAllPortfolios,
  } = useExchange();
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);

  const anyLoading = connectedExchanges.some((n) => exchanges[n].loading);

  useEffect(() => {
    if (connectedExchanges.length > 0) {
      refreshAllPortfolios();
    }
  }, [connectedExchanges.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (connectedExchanges.length === 0) return null;

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-[var(--text)]">Consolidated Book</h2>
              <div className="flex items-center gap-1.5">
                {connectedExchanges.map((name) => (
                  <span
                    key={name}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${EXCHANGE_COLORS[name]}`}
                  >
                    {EXCHANGE_LABELS[name]}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Total Value: <span className="text-[var(--text)] font-mono font-bold">
                ${allTotalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              {connectedExchanges.length > 1 && (
                <span className="text-gray-600 ml-2">
                  across {connectedExchanges.length} exchanges
                </span>
              )}
            </p>
          </div>
          <button
            onClick={refreshAllPortfolios}
            disabled={anyLoading}
            className="text-gray-400 hover:text-[var(--text)] disabled:opacity-50 p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className={`w-5 h-5 ${anyLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Per-exchange summary */}
        {connectedExchanges.length > 1 && (
          <div className="flex items-center gap-3 mt-3">
            {connectedExchanges.map((name) => (
              <div key={name} className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-1.5 border border-gray-700/50">
                <span className={`w-2 h-2 rounded-full ${name === 'binance' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                <span className="text-xs text-gray-400">{EXCHANGE_LABELS[name]}</span>
                <span className="text-xs text-[var(--text)] font-mono">
                  ${exchanges[name].totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading state */}
      {anyLoading && book.length === 0 ? (
        <div className="p-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3">Asset</th>
                <th className="text-right px-6 py-3">Total Amount</th>
                <th className="text-right px-6 py-3">USD Value</th>
                <th className="text-right px-6 py-3">Allocation</th>
                <th className="text-center px-6 py-3">Exchanges</th>
              </tr>
            </thead>
            <tbody>
              {book.map((entry) => {
                const isExpanded = expandedAsset === entry.asset;
                const hasMultiple = entry.exchanges.length > 1;

                return (
                  <React.Fragment key={entry.asset}>
                    {/* Main consolidated row */}
                    <tr
                      className={`border-t border-[var(--border)]/50 transition-colors ${
                        hasMultiple ? 'cursor-pointer hover:bg-gray-800/30' : 'hover:bg-gray-800/30'
                      } ${isExpanded ? 'bg-gray-800/20' : ''}`}
                      onClick={() => {
                        if (hasMultiple) setExpandedAsset(isExpanded ? null : entry.asset);
                      }}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text)] font-medium">{entry.asset}</span>
                          {hasMultiple && (
                            <svg
                              className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right text-gray-300 font-mono">
                        {entry.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </td>
                      <td className="px-6 py-3 text-right text-[var(--text)] font-mono">
                        ${entry.totalUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500 rounded-full"
                              style={{ width: `${allTotalValue ? (entry.totalUsdValue / allTotalValue) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-gray-400 text-sm font-mono">
                            {allTotalValue ? ((entry.totalUsdValue / allTotalValue) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {entry.exchanges.map((ex) => (
                            <span
                              key={ex.exchange}
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${EXCHANGE_COLORS[ex.exchange] || 'bg-gray-800 text-gray-400 border-gray-700'}`}
                            >
                              {(EXCHANGE_LABELS[ex.exchange] || ex.exchange).slice(0, 3).toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded per-exchange breakdown */}
                    {isExpanded && entry.exchanges.map((ex) => (
                      <tr key={`${entry.asset}-${ex.exchange}`} className="bg-[var(--surface)]/80 border-t border-[var(--border)]/30">
                        <td className="px-6 py-2 pl-12">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${ex.exchange === 'binance' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                            <span className="text-gray-400 text-sm">{EXCHANGE_LABELS[ex.exchange] || ex.exchange}</span>
                          </div>
                        </td>
                        <td className="px-6 py-2 text-right text-gray-400 font-mono text-sm">
                          {ex.total.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                          {ex.locked > 0 && (
                            <span className="text-gray-600 text-xs ml-1">
                              ({ex.locked.toLocaleString(undefined, { maximumFractionDigits: 4 })} locked)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-2 text-right text-gray-400 font-mono text-sm">
                          ${ex.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-2 text-right">
                          <span className="text-[var(--text-muted)] text-xs font-mono">
                            {entry.totalUsdValue ? ((ex.usdValue / entry.totalUsdValue) * 100).toFixed(0) : 0}% of {entry.asset}
                          </span>
                        </td>
                        <td />
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
