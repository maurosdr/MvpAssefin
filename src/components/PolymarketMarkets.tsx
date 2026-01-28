'use client';

import { useEffect, useState } from 'react';

interface PolymarketData {
  id: string;
  title: string;
  slug: string;
  volume: number;
  liquidity: number;
  yes_price: number;
  no_price: number;
  endDate: string;
}

export default function PolymarketMarkets() {
  const [markets, setMarkets] = useState<PolymarketData[]>([]);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarkets = () => {
      fetch('/api/polymarket')
        .then((r) => r.json())
        .then((data) => {
          setMarkets(data.markets || []);
          setSource(data.source || '');
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatVolume = (v: number) => {
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
    return '$' + v.toFixed(0);
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Top Polymarket Markets
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Top 5 markets by volume via{' '}
              <a
                href="https://polymarket.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300"
              >
                Polymarket
              </a>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {source === 'cache' && (
              <span className="text-xs bg-gray-800 text-gray-500 px-2 py-1 rounded">Cached</span>
            )}
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded font-medium">
              PREDICTION
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3">#</th>
                <th className="text-left px-6 py-3">Market</th>
                <th className="text-right px-6 py-3">Yes</th>
                <th className="text-right px-6 py-3">No</th>
                <th className="text-right px-6 py-3">Volume</th>
                <th className="text-right px-6 py-3">Liquidity</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((market, i) => (
                <tr
                  key={market.id}
                  className="border-t border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                  onClick={() =>
                    window.open(
                      market.slug
                        ? `https://polymarket.com/event/${market.slug}`
                        : 'https://polymarket.com',
                      '_blank'
                    )
                  }
                >
                  <td className="px-6 py-3 text-gray-500 text-sm">{i + 1}</td>
                  <td className="px-6 py-3">
                    <span className="text-white text-sm font-medium">{market.title}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-green-400 font-mono font-medium text-sm">
                      {(market.yes_price * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="text-red-400 font-mono font-medium text-sm">
                      {(market.no_price * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-300 font-mono text-sm">
                    {formatVolume(market.volume)}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-500 font-mono text-sm">
                    {formatVolume(market.liquidity)}
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
