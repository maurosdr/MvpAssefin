'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ManualPosition, AssetCategory } from '@/types/portfolio';

interface PortfolioContextType {
  positions: ManualPosition[];
  addPosition: (position: Omit<ManualPosition, 'id'>) => void;
  removePosition: (id: string) => void;
  updatePosition: (id: string, updates: Partial<ManualPosition>) => void;
  refreshCurrentPrices: () => Promise<void>;
  loading: boolean;
}

const PortfolioContext = createContext<PortfolioContextType>({
  positions: [],
  addPosition: () => {},
  removePosition: () => {},
  updatePosition: () => {},
  refreshCurrentPrices: async () => {},
  loading: false,
});

const STORAGE_KEY = 'assefin_portfolio_positions';

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [positions, setPositions] = useState<ManualPosition[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setPositions(parsed);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    }
  }, [positions, mounted]);

  const addPosition = useCallback((position: Omit<ManualPosition, 'id'>) => {
    const newPosition: ManualPosition = {
      ...position,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
    };
    setPositions((prev) => [...prev, newPosition]);
  }, []);

  const removePosition = useCallback((id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePosition = useCallback((id: string, updates: Partial<ManualPosition>) => {
    setPositions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const refreshCurrentPrices = useCallback(async () => {
    if (positions.length === 0) return;
    setLoading(true);

    try {
      // Group non-prediction positions by symbol for batch fetching
      const stockPositions = positions.filter(
        (p) => p.type !== 'prediction' && p.type !== 'crypto'
      );
      const uniqueSymbols = [...new Set(stockPositions.map((p) => p.symbol))];

      // Fetch prices in parallel (max 5 at a time)
      const priceMap = new Map<string, number>();

      for (let i = 0; i < uniqueSymbols.length; i += 5) {
        const batch = uniqueSymbols.slice(i, i + 5);
        const results = await Promise.allSettled(
          batch.map(async (symbol) => {
            const res = await fetch(`/api/stocks/quote?symbol=${symbol}&range=1d&interval=1d`);
            if (!res.ok) return null;
            const data = await res.json();
            return { symbol, price: data.currentPrice as number };
          })
        );

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            priceMap.set(result.value.symbol, result.value.price);
          }
        }
      }

      // Update positions with current prices
      setPositions((prev) =>
        prev.map((p) => {
          const currentPrice = priceMap.get(p.symbol);
          if (currentPrice !== undefined) {
            return { ...p, currentPrice };
          }
          return p;
        })
      );
    } catch {
      // Price refresh failed
    } finally {
      setLoading(false);
    }
  }, [positions]);

  const value = useMemo(
    () => ({
      positions,
      addPosition,
      removePosition,
      updatePosition,
      refreshCurrentPrices,
      loading,
    }),
    [positions, addPosition, removePosition, updatePosition, refreshCurrentPrices, loading]
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export const usePortfolio = () => useContext(PortfolioContext);
