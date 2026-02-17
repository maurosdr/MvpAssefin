'use client';

import { useEffect, useState } from 'react';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function MarketTickerBar() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/crypto', { 
          cache: 'no-store',
          next: { revalidate: 5 }
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          const topMarkets = data.slice(0, 8).map((c: { base: string; price: number; changePercent24h: number }) => ({
            symbol: c.base,
            price: c.price,
            change: c.changePercent24h || 0,
            changePercent: c.changePercent24h || 0,
          }));
          setMarketData(topMarkets);
        }
      } catch {
        // Error handling
      } finally {
        setLoading(false);
      }
    };

    // Delay inicial para não competir com outras chamadas
    const timeout = setTimeout(fetchData, 100);
    const interval = setInterval(fetchData, 5000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-10 bg-[var(--bg-elevated)] border-b border-[var(--border)] flex items-center px-4">
        <div className="w-full h-4 bg-[var(--surface)]/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-10 bg-[var(--bg-elevated)] border-b border-[var(--border)] overflow-hidden relative z-50">
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-elevated)] via-transparent to-[var(--bg-elevated)] z-10 pointer-events-none" />
      <div className="flex items-center h-full animate-scroll">
        <div className="flex items-center gap-8 px-6 whitespace-nowrap">
          {marketData.map((market, idx) => (
            <div key={`${market.symbol}-${idx}`} className="flex items-center gap-3">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                {market.symbol}/USD
              </span>
              <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`text-xs font-bold ${
                  market.change >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                }`}
              >
                {market.change >= 0 ? '▲' : '▼'} {Math.abs(market.changePercent).toFixed(2)}%
              </span>
            </div>
          ))}
          {/* Duplicate for seamless loop */}
          {marketData.map((market, idx) => (
            <div key={`dup-${market.symbol}-${idx}`} className="flex items-center gap-3">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                {market.symbol}/USD
              </span>
              <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`text-xs font-bold ${
                  market.change >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                }`}
              >
                {market.change >= 0 ? '▲' : '▼'} {Math.abs(market.changePercent).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

