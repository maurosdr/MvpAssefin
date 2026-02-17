'use client';

import { useEffect, useState } from 'react';

interface BrazilMarket {
  id: string;
  title: string;
  slug: string;
  volume: number;
  endDate: string;
  candidates: { name: string; odds: number }[];
}

export default function PolymarketBrazilTable() {
  const [markets, setMarkets] = useState<BrazilMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');

  useEffect(() => {
    fetch('/api/polymarket/brazil')
      .then((r) => r.json())
      .then((data) => {
        setMarkets(data.markets || []);
        setSource(data.source || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="modern-card p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (markets.length === 0) return null;

  const formatVolume = (v: number) => {
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v.toLocaleString()}`;
  };

  return (
    <div className="modern-card">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
          <div>
            <h3 className="section-title">Prediction Markets - Brasil</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">Polymarket</p>
          </div>
        </div>
        {source === 'fallback' && (
          <span className="text-[10px] font-bold px-2 py-1 bg-[var(--warning)]/20 text-[var(--warning)] rounded-full border border-[var(--warning)]/30">
            DADOS ESTIMADOS
          </span>
        )}
      </div>

      <div className="space-y-6">
        {markets.map((market) => (
          <div key={market.id} className="border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-[var(--text-primary)] flex-1">
                {market.title}
              </h4>
              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                <span className="text-[10px] text-[var(--text-muted)] data-value">
                  Vol: {formatVolume(market.volume)}
                </span>
                {market.endDate && (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {new Date(market.endDate).toLocaleDateString('pt-BR', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {market.candidates.map((candidate, idx) => {
                const pct = (candidate.odds * 100).toFixed(1);
                const isTop = idx === 0;
                return (
                  <div key={candidate.name} className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold w-36 truncate ${
                        isTop ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {candidate.name}
                    </span>
                    <div className="flex-1 h-6 bg-[var(--surface)] rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isTop
                            ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)]'
                            : 'bg-[var(--border-strong)]'
                        }`}
                        style={{ width: `${Math.max(candidate.odds * 100, 2)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-bold text-[var(--text-primary)]">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
