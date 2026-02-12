'use client';

import { useEffect, useState } from 'react';

interface MarketOutcome {
  name: string;
  price: number;
}

interface Market {
  id: string;
  title: string;
  slug: string;
  volume: number;
  liquidity: number;
  endDate: string;
  category: string;
  outcomes: MarketOutcome[];
}

interface PolymarketData {
  politics: Market[];
  crypto: Market[];
  economy: Market[];
  source: string;
}

interface CategoryConfig {
  key: 'politics' | 'crypto' | 'economy';
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  bgColor: string;
  borderColor: string;
}

const categories: CategoryConfig[] = [
  {
    key: 'politics',
    title: 'Politics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    accentColor: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
  },
  {
    key: 'crypto',
    title: 'Crypto',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    accentColor: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
  },
  {
    key: 'economy',
    title: 'Economy',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    accentColor: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
  },
];

function MarketCard({ market, config }: { market: Market; config: CategoryConfig }) {
  const topOutcomes = market.outcomes.slice(0, 2);

  const formatVolume = (v: number) => {
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
    return '$' + v.toFixed(0);
  };

  return (
    <div
      className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/70 hover:border-gray-600/50 transition-all cursor-pointer"
      onClick={() =>
        window.open(
          market.slug
            ? `https://polymarket.com/event/${market.slug}`
            : 'https://polymarket.com',
          '_blank'
        )
      }
    >
      <h4 className="text-white text-sm font-medium mb-3 line-clamp-2 min-h-[2.5rem]">
        {market.title}
      </h4>

      <div className="space-y-2 mb-3">
        {topOutcomes.map((outcome, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-gray-400 text-xs truncate max-w-[60%]">
              {outcome.name}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${i === 0 ? 'bg-green-500' : 'bg-gray-500'}`}
                  style={{ width: `${outcome.price * 100}%` }}
                />
              </div>
              <span className={`font-mono text-xs font-medium ${i === 0 ? 'text-green-400' : 'text-gray-400'}`}>
                {(outcome.price * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700/50">
        <span>Vol: {formatVolume(market.volume)}</span>
        <span className={config.accentColor}>View on Polymarket</span>
      </div>
    </div>
  );
}

function CategorySection({ config, markets, loading }: { config: CategoryConfig; markets: Market[]; loading: boolean }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`${config.accentColor}`}>
              {config.icon}
            </div>
            <h3 className="text-lg font-bold text-white">{config.title} Predictions</h3>
          </div>
          <span className={`text-xs ${config.bgColor} ${config.accentColor} px-2 py-1 rounded font-medium`}>
            {markets.length} markets
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-8 flex justify-center">
          <div className={`w-6 h-6 border-2 ${config.borderColor} border-t-transparent rounded-full animate-spin`} />
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {markets.slice(0, 5).map((market) => (
            <MarketCard key={market.id} market={market} config={config} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PolymarketCards({
  filterCategories,
}: {
  filterCategories?: ('politics' | 'crypto' | 'economy')[];
} = {}) {
  const [data, setData] = useState<PolymarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarkets = () => {
      fetch('/api/polymarket')
        .then((r) => r.json())
        .then((result) => {
          if (result.politics || result.crypto || result.economy) {
            setData(result);
          } else if (result.markets) {
            setData(result.markets);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Polymarket Predictions
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Real-time prediction markets via{' '}
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
        {data?.source === 'cache' && (
          <span className="text-xs bg-gray-800 text-gray-500 px-2 py-1 rounded">Cached</span>
        )}
      </div>

      {(filterCategories
        ? categories.filter((c) => filterCategories.includes(c.key))
        : categories
      ).map((config) => (
        <CategorySection
          key={config.key}
          config={config}
          markets={data?.[config.key] || []}
          loading={loading}
        />
      ))}
    </div>
  );
}
