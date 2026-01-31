'use client';

import { useEffect, useState } from 'react';

interface Outcome {
  name: string;
  probability: number;
}

interface PolymarketData {
  id: string;
  title: string;
  slug: string;
  volume: number;
  liquidity: number;
  endDate: string;
  isMultiOutcome: boolean;
  outcomes: Outcome[];
}

function PolymarketCard({ market, index }: { market: PolymarketData; index: number }) {
  const formatVolume = (v: number) => {
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
    return '$' + v.toFixed(0);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Get top 2 outcomes for display
  const topOutcomes = market.outcomes.slice(0, 2);
  const hasMoreOutcomes = market.outcomes.length > 2;

  // Colors for outcomes
  const getOutcomeColor = (index: number, probability: number) => {
    if (index === 0) return probability >= 0.5 ? 'text-green-400' : 'text-yellow-400';
    return 'text-gray-400';
  };

  const getBgColor = (index: number) => {
    if (index === 0) return 'bg-green-500/10 border-green-500/20';
    return 'bg-gray-800/50 border-gray-700/50';
  };

  return (
    <div
      className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:bg-gray-800/50 hover:border-purple-500/30 transition-all cursor-pointer group"
      onClick={() =>
        window.open(
          market.slug ? `https://polymarket.com/event/${market.slug}` : 'https://polymarket.com',
          '_blank'
        )
      }
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-gray-500 font-mono">#{index + 1}</span>
        <div className="flex items-center gap-2">
          {market.isMultiOutcome && (
            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-medium">
              MULTI
            </span>
          )}
          <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">
            {formatDate(market.endDate)}
          </span>
        </div>
      </div>

      {/* Market Title */}
      <h3 className="text-white font-medium text-sm mb-4 line-clamp-2 group-hover:text-purple-300 transition-colors min-h-[40px]">
        {market.title}
      </h3>

      {/* Top 2 Outcomes */}
      <div className="space-y-2 mb-4">
        {topOutcomes.map((outcome, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border ${getBgColor(i)}`}
          >
            <span className="text-sm text-gray-300 truncate max-w-[60%]">{outcome.name}</span>
            <span className={`font-mono font-bold text-sm ${getOutcomeColor(i, outcome.probability)}`}>
              {(outcome.probability * 100).toFixed(0)}%
            </span>
          </div>
        ))}
        {hasMoreOutcomes && (
          <p className="text-xs text-gray-600 text-center">
            +{market.outcomes.length - 2} more outcomes
          </p>
        )}
      </div>

      {/* Volume & Liquidity */}
      <div className="flex items-center justify-between text-xs border-t border-gray-800 pt-3">
        <div>
          <span className="text-gray-500">Vol: </span>
          <span className="text-gray-300 font-mono">{formatVolume(market.volume)}</span>
        </div>
        <div>
          <span className="text-gray-500">Liq: </span>
          <span className="text-gray-400 font-mono">{formatVolume(market.liquidity)}</span>
        </div>
      </div>
    </div>
  );
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Polymarket Predictions
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Top 10 markets by volume via{' '}
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

      {/* Cards Grid */}
      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {markets.map((market, i) => (
            <PolymarketCard key={market.id} market={market} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
