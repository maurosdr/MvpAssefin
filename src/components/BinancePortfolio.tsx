'use client';

import { useEffect } from 'react';
import { useExchange, ExchangeName } from '@/context/ExchangeContext';

const EXCHANGE_NAMES: ExchangeName[] = ['binance', 'coinbase'];

export default function BinancePortfolio() {
  const { exchanges, connectedExchanges, allPositions, allTotalValue, refreshPortfolio } = useExchange();

  const anyLoading = EXCHANGE_NAMES.some((n) => exchanges[n].loading);

  useEffect(() => {
    connectedExchanges.forEach((name) => refreshPortfolio(name));
  }, [connectedExchanges, refreshPortfolio]);

  if (connectedExchanges.length === 0) return null;

  const handleRefresh = () => {
    connectedExchanges.forEach((name) => refreshPortfolio(name));
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">
            Portfolio {connectedExchanges.length > 1 ? '(All Exchanges)' : `(${connectedExchanges[0]?.charAt(0).toUpperCase()}${connectedExchanges[0]?.slice(1)})`}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Total: <span className="text-white font-mono">${allTotalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={anyLoading}
          className="text-gray-400 hover:text-white disabled:opacity-50"
        >
          <svg className={`w-5 h-5 ${anyLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {anyLoading && allPositions.length === 0 ? (
        <div className="p-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3">Asset</th>
                <th className="text-right px-6 py-3">Amount</th>
                <th className="text-right px-6 py-3">USD Value</th>
                <th className="text-right px-6 py-3">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {allPositions.map((pos) => (
                <tr key={pos.asset} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-6 py-3">
                    <span className="text-white font-medium">{pos.asset}</span>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-300 font-mono">
                    {pos.total.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </td>
                  <td className="px-6 py-3 text-right text-white font-mono">
                    ${pos.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 rounded-full"
                          style={{ width: `${allTotalValue ? (pos.usdValue / allTotalValue) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-gray-400 text-sm font-mono">
                        {allTotalValue ? ((pos.usdValue / allTotalValue) * 100).toFixed(1) : 0}%
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
