'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCryptoName, CRYPTO_NAMES } from '@/lib/crypto-names';

interface SearchableCrypto {
  symbol: string;
  base: string;
  price: number;
}

export default function CryptoSearch({ cryptos }: { cryptos?: SearchableCrypto[] }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchableCrypto[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const q = query.toUpperCase();

    if (cryptos && cryptos.length > 0) {
      const filtered = cryptos.filter(
        (c) =>
          c.base.includes(q) ||
          getCryptoName(c.base).toUpperCase().includes(q)
      );
      setSuggestions(filtered.slice(0, 10));
    } else {
      const allSymbols = Object.keys(CRYPTO_NAMES);
      const filtered = allSymbols
        .filter((s) => s.includes(q) || CRYPTO_NAMES[s].toUpperCase().includes(q))
        .map((s) => ({ symbol: `${s}/USDT`, base: s, price: 0 }));
      setSuggestions(filtered.slice(0, 10));
    }
  }, [query, cryptos]);

  const handleSelect = (base: string) => {
    setQuery('');
    setShowDropdown(false);
    router.push(`/crypto/${base}`);
  };

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Buscar crypto (BTC, ETH, SOL...)"
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-all"
        />
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden backdrop-blur-xl">
          {suggestions.map((s) => (
            <button
              key={s.base}
              onClick={() => handleSelect(s.base)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--surface-hover)] text-left transition-colors border-b border-[var(--border-subtle)] last:border-b-0"
            >
              <div className="flex flex-col">
                <span className="text-[var(--text-primary)] font-semibold text-sm">{s.base}</span>
                <span className="text-[var(--text-muted)] text-xs mt-0.5">{getCryptoName(s.base)}</span>
              </div>
              {s.price > 0 && (
                <span className="text-[var(--text-secondary)] text-sm font-medium">
                  ${s.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
