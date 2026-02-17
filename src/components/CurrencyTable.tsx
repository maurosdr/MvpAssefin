'use client';

import { useState, useEffect } from 'react';

interface CurrencyData {
  pair: string;
  name: string;
  price: number;
  change1d: number;
  change1w: number;
  high?: number;
  low?: number;
  updatedAt?: string;
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

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    return price.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  };

  return (
    <div className="modern-card">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
          <div>
            <h3 className="section-title">Principais Moedas</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Cotações via Brapi</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 bg-[var(--success)] rounded-full animate-pulse" />
          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Live</span>
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)] border-b-2 border-[var(--border)]">
                <th className="text-left pb-3">Par</th>
                <th className="text-right pb-3">Cotação</th>
                <th className="text-right pb-3">Var %</th>
                <th className="text-right pb-3 hidden sm:table-cell">Máx</th>
                <th className="text-right pb-3 hidden sm:table-cell">Mín</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {currencies.map((c) => (
                <tr key={c.pair} className="hover:bg-[var(--surface-hover)] transition-colors">
                  <td className="py-3 pr-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-[var(--accent)]">
                          {c.pair.split('/')[0].slice(0, 3)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-[var(--text-primary)] block">{c.pair}</span>
                        <span className="text-[10px] text-[var(--text-muted)] block truncate">{c.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-3 px-1">
                    <span className="text-sm font-bold text-[var(--text-primary)] data-value">
                      R$ {formatPrice(c.price)}
                    </span>
                  </td>
                  <td className="text-right py-3 px-1">
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-bold data-value ${
                        c.change1d >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                      }`}
                    >
                      {c.change1d >= 0 ? '▲' : '▼'}
                      {c.change1d >= 0 ? '+' : ''}{c.change1d.toFixed(2)}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-1 hidden sm:table-cell">
                    <span className="text-xs text-[var(--text-secondary)] data-value">
                      {c.high ? formatPrice(c.high) : '-'}
                    </span>
                  </td>
                  <td className="text-right py-3 px-1 hidden sm:table-cell">
                    <span className="text-xs text-[var(--text-secondary)] data-value">
                      {c.low ? formatPrice(c.low) : '-'}
                    </span>
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
