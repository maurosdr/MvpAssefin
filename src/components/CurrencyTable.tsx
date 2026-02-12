'use client';

import { useState, useEffect } from 'react';

interface CurrencyData {
  pair: string;
  name: string;
  price: number;
  change1d: number;
  change1w: number;
}

export default function CurrencyTable() {
  const [currencies, setCurrencies] = useState<CurrencyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/market/currencies')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCurrencies(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Major Currencies
        </h2>
      </div>

      {loading ? (
        <div className="p-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="text-left px-6 py-3 font-medium">Pair</th>
                <th className="text-right px-6 py-3 font-medium">Price</th>
                <th className="text-right px-6 py-3 font-medium">1D %</th>
                <th className="text-right px-6 py-3 font-medium">1W %</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((c) => (
                <tr key={c.pair} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-3">
                    <div>
                      <span className="text-white font-medium text-sm">{c.pair}</span>
                      <span className="text-gray-500 text-xs ml-2">{c.name}</span>
                    </div>
                  </td>
                  <td className="text-right px-6 py-3 text-white font-mono text-sm">
                    {c.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </td>
                  <td className={`text-right px-6 py-3 font-mono text-sm ${c.change1d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {c.change1d >= 0 ? '+' : ''}{c.change1d.toFixed(2)}%
                  </td>
                  <td className={`text-right px-6 py-3 font-mono text-sm ${c.change1w >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {c.change1w >= 0 ? '+' : ''}{c.change1w.toFixed(2)}%
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
