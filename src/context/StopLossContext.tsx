'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface StopLossConfig {
  id: string;
  symbol: string;
  type: 'atr' | 'technical' | 'trailing' | 'ratio';
  label: string;
  entryPrice: number;
  stopLevel: number;
  targetLevel: number;
  createdAt: string;
  // Type-specific params
  atrPeriod?: number;
  atrMultiplier?: number;
  trailPercent?: number;
  riskRewardRatio?: number;
  supportLevel?: number;
  resistanceLevel?: number;
  riskAmount?: number;
}

interface StopLossContextType {
  stopLosses: StopLossConfig[];
  addStopLoss: (config: Omit<StopLossConfig, 'id' | 'createdAt'>) => void;
  removeStopLoss: (id: string) => void;
  getStopLossesForSymbol: (symbol: string) => StopLossConfig[];
}

const StopLossContext = createContext<StopLossContextType>({
  stopLosses: [],
  addStopLoss: () => {},
  removeStopLoss: () => {},
  getStopLossesForSymbol: () => [],
});

const STORAGE_KEY = 'crypto-dashboard-stop-losses';

function loadFromStorage(): StopLossConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(configs: StopLossConfig[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch {
    // localStorage full or unavailable
  }
}

export function StopLossProvider({ children }: { children: React.ReactNode }) {
  const [stopLosses, setStopLosses] = useState<StopLossConfig[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setStopLosses(loadFromStorage());
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) {
      saveToStorage(stopLosses);
    }
  }, [stopLosses, initialized]);

  const addStopLoss = useCallback((config: Omit<StopLossConfig, 'id' | 'createdAt'>) => {
    const newConfig: StopLossConfig = {
      ...config,
      id: `sl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    setStopLosses((prev) => [...prev, newConfig]);
  }, []);

  const removeStopLoss = useCallback((id: string) => {
    setStopLosses((prev) => prev.filter((sl) => sl.id !== id));
  }, []);

  const getStopLossesForSymbol = useCallback(
    (symbol: string) => stopLosses.filter((sl) => sl.symbol === symbol),
    [stopLosses]
  );

  const value = useMemo(
    () => ({ stopLosses, addStopLoss, removeStopLoss, getStopLossesForSymbol }),
    [stopLosses, addStopLoss, removeStopLoss, getStopLossesForSymbol]
  );

  return <StopLossContext.Provider value={value}>{children}</StopLossContext.Provider>;
}

export function useStopLoss() {
  return useContext(StopLossContext);
}
