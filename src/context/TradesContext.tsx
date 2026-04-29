'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Trade } from '@/types/portfolio';

interface TradesContextType {
  trades: Trade[];
  addTrade: (trade: Omit<Trade, 'id'>) => void;
  removeTrade: (id: string) => void;
  updateTrade: (id: string, updates: Partial<Trade>) => void;
}

const TradesContext = createContext<TradesContextType>({
  trades: [],
  addTrade: () => {},
  removeTrade: () => {},
  updateTrade: () => {},
});

const STORAGE_KEY = 'assefin_portfolio_trades';

export function TradesProvider({ children }: { children: React.ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setTrades(parsed);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
    }
  }, [trades, mounted]);

  const addTrade = useCallback((trade: Omit<Trade, 'id'>) => {
    const newTrade: Trade = {
      ...trade,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
    };
    setTrades((prev) => [newTrade, ...prev]);
  }, []);

  const removeTrade = useCallback((id: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateTrade = useCallback((id: string, updates: Partial<Trade>) => {
    setTrades((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const value = useMemo(
    () => ({ trades, addTrade, removeTrade, updateTrade }),
    [trades, addTrade, removeTrade, updateTrade]
  );

  return <TradesContext.Provider value={value}>{children}</TradesContext.Provider>;
}

export const useTrades = () => useContext(TradesContext);
