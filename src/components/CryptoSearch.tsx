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
    <div ref={ref} className="relative w-full max-w-lg">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
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
          placeholder="Search crypto (BTC, Ethereum, SOL...)"
          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30"
        />
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s.base}
              onClick={() => handleSelect(s.base)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800 text-left transition-colors"
            >
              <div>
                <span className="text-white font-medium">{s.base}</span>
                <span className="text-gray-500 ml-2 text-sm">{getCryptoName(s.base)}</span>
              </div>
              {s.price > 0 && (
                <span className="text-gray-400 text-sm">
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
