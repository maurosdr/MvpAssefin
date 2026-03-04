'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface PredictionMarketContextType {
  kalshiEnabled: boolean;
  polymarketEnabled: boolean;
  toggleKalshi: () => void;
  togglePolymarket: () => void;
  enabledCount: number;
}

const PredictionMarketContext = createContext<PredictionMarketContextType>({
  kalshiEnabled: false,
  polymarketEnabled: false,
  toggleKalshi: () => {},
  togglePolymarket: () => {},
  enabledCount: 0,
});

export function PredictionMarketProvider({ children }: { children: React.ReactNode }) {
  const [kalshiEnabled, setKalshiEnabled] = useState(false);
  const [polymarketEnabled, setPolymarketEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const kalshi = localStorage.getItem('kalshi_enabled');
      const polymarket = localStorage.getItem('polymarket_enabled');
      if (kalshi === 'true') setKalshiEnabled(true);
      if (polymarket === 'true') setPolymarketEnabled(true);
    } catch {
      // localStorage not available
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('kalshi_enabled', String(kalshiEnabled));
    }
  }, [kalshiEnabled, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('polymarket_enabled', String(polymarketEnabled));
    }
  }, [polymarketEnabled, mounted]);

  const toggleKalshi = useCallback(() => {
    setKalshiEnabled((prev) => !prev);
  }, []);

  const togglePolymarket = useCallback(() => {
    setPolymarketEnabled((prev) => !prev);
  }, []);

  const enabledCount = (kalshiEnabled ? 1 : 0) + (polymarketEnabled ? 1 : 0);

  const value = useMemo(
    () => ({
      kalshiEnabled,
      polymarketEnabled,
      toggleKalshi,
      togglePolymarket,
      enabledCount,
    }),
    [kalshiEnabled, polymarketEnabled, toggleKalshi, togglePolymarket, enabledCount]
  );

  return (
    <PredictionMarketContext.Provider value={value}>
      {children}
    </PredictionMarketContext.Provider>
  );
}

export const usePredictionMarkets = () => useContext(PredictionMarketContext);
