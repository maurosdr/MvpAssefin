'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCryptoName, CRYPTO_NAMES } from '@/lib/crypto-names';
import { MAIN_STOCKS, STOCK_NAMES } from '@/lib/stocks-data';

type AssetType = 'crypto' | 'stock';

interface SearchableAsset {
  symbol: string;
  base: string;
  name: string;
  price: number;
  type: AssetType;
}

interface AssetSearchProps {
  cryptos?: { symbol: string; base: string; price: number }[];
  stocks?: { symbol: string; name: string; price: number }[];
}

export default function AssetSearch({ cryptos, stocks }: AssetSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchableAsset[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setSelectedIndex(-1);
      return;
    }

    const q = query.toUpperCase();
    const results: SearchableAsset[] = [];

    // Search cryptos
    if (cryptos && cryptos.length > 0) {
      const filtered = cryptos.filter(
        (c) =>
          c.base.includes(q) ||
          getCryptoName(c.base).toUpperCase().includes(q)
      );
      results.push(
        ...filtered.slice(0, 6).map((c) => ({
          symbol: c.symbol,
          base: c.base,
          name: getCryptoName(c.base),
          price: c.price,
          type: 'crypto' as AssetType,
        }))
      );
    } else {
      const allCryptoSymbols = Object.keys(CRYPTO_NAMES);
      const filtered = allCryptoSymbols.filter(
        (s) => s.includes(q) || CRYPTO_NAMES[s].toUpperCase().includes(q)
      );
      results.push(
        ...filtered.slice(0, 6).map((s) => ({
          symbol: `${s}/USDT`,
          base: s,
          name: CRYPTO_NAMES[s],
          price: 0,
          type: 'crypto' as AssetType,
        }))
      );
    }

    // Search stocks
    const stockResults = MAIN_STOCKS.filter(
      (s) => s.includes(q) || (STOCK_NAMES[s] || '').toUpperCase().includes(q)
    );
    results.push(
      ...stockResults.slice(0, 6).map((s) => {
        const stockData = stocks?.find((st) => st.symbol === s);
        return {
          symbol: s,
          base: s,
          name: STOCK_NAMES[s] || s,
          price: stockData?.price || 0,
          type: 'stock' as AssetType,
        };
      })
    );

    setSuggestions(results.slice(0, 10));
    setSelectedIndex(-1);
  }, [query, cryptos, stocks]);

  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  const handleSelect = (asset: SearchableAsset) => {
    setQuery('');
    setShowDropdown(false);
    setSelectedIndex(-1);
    if (asset.type === 'crypto') {
      router.push(`/crypto/${asset.base}`);
    } else {
      router.push(`/stocks/${asset.base}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelect(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
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
          onKeyDown={handleKeyDown}
          placeholder="Buscar ativos (BTC, PETR4, ETH...)"
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-all"
        />
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden backdrop-blur-xl max-h-[400px] overflow-y-auto">
          {suggestions.map((s, idx) => (
            <button
              key={`${s.type}-${s.base}`}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              onClick={() => handleSelect(s)}
              className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors border-b border-[var(--border-subtle)] last:border-b-0 ${
                idx === selectedIndex
                  ? 'bg-[var(--surface-hover)]'
                  : 'hover:bg-[var(--surface-hover)]'
              }`}
            >
              <div className="flex flex-col">
                <span className="text-[var(--text-primary)] font-semibold text-sm">
                  {s.base}
                </span>
                <span className="text-[var(--text-muted)] text-xs mt-0.5">
                  {s.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {s.price > 0 && (
                  <span className="text-[var(--text-secondary)] text-sm font-medium">
                    {s.type === 'stock' ? 'R$ ' : '$'}
                    {s.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    s.type === 'crypto'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {s.type === 'crypto' ? 'Cripto' : 'Ações'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
