'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BinancePosition } from '@/types/crypto';

export type ExchangeName = 'binance' | 'coinbase';

interface ExchangeConnection {
  connected: boolean;
  apiKeyPreview: string;
  positions: BinancePosition[];
  totalValue: number;
  loading: boolean;
}

interface ExchangeContextType {
  exchanges: Record<ExchangeName, ExchangeConnection>;
  activeExchange: ExchangeName;
  setActiveExchange: (name: ExchangeName) => void;
  connect: (exchange: ExchangeName, apiKey: string, secret: string) => Promise<boolean>;
  disconnect: (exchange: ExchangeName) => Promise<void>;
  refreshPortfolio: (exchange: ExchangeName) => Promise<void>;
  // Convenience getters for backwards compatibility
  connected: boolean;
  apiKeyPreview: string;
  positions: BinancePosition[];
  totalValue: number;
  loading: boolean;
  // Aggregate
  allPositions: BinancePosition[];
  allTotalValue: number;
  connectedExchanges: ExchangeName[];
}

const defaultConnection: ExchangeConnection = {
  connected: false,
  apiKeyPreview: '',
  positions: [],
  totalValue: 0,
  loading: false,
};

const ExchangeContext = createContext<ExchangeContextType>({
  exchanges: {
    binance: { ...defaultConnection },
    coinbase: { ...defaultConnection },
  },
  activeExchange: 'binance',
  setActiveExchange: () => {},
  connect: async () => false,
  disconnect: async () => {},
  refreshPortfolio: async () => {},
  connected: false,
  apiKeyPreview: '',
  positions: [],
  totalValue: 0,
  loading: false,
  allPositions: [],
  allTotalValue: 0,
  connectedExchanges: [],
});

const EXCHANGE_NAMES: ExchangeName[] = ['binance', 'coinbase'];

export function ExchangeProvider({ children }: { children: React.ReactNode }) {
  const [exchangeStates, setExchangeStates] = useState<Record<ExchangeName, ExchangeConnection>>({
    binance: { ...defaultConnection },
    coinbase: { ...defaultConnection },
  });
  const [activeExchange, setActiveExchange] = useState<ExchangeName>('binance');

  const updateExchange = useCallback(
    (name: ExchangeName, updates: Partial<ExchangeConnection>) => {
      setExchangeStates((prev) => ({
        ...prev,
        [name]: { ...prev[name], ...updates },
      }));
    },
    []
  );

  const checkConnection = useCallback(
    async (name: ExchangeName) => {
      try {
        // Try the new multi-exchange endpoint
        const res = await fetch(`/api/exchange/${name}/keys`);
        const data = await res.json();
        updateExchange(name, {
          connected: data.connected || false,
          apiKeyPreview: data.apiKeyPreview || '',
        });
      } catch {
        // Fallback for binance to old endpoint for backwards compat
        if (name === 'binance') {
          try {
            const res = await fetch('/api/binance/keys');
            const data = await res.json();
            updateExchange(name, {
              connected: data.connected || false,
              apiKeyPreview: data.apiKeyPreview || '',
            });
          } catch {
            updateExchange(name, { connected: false });
          }
        } else {
          updateExchange(name, { connected: false });
        }
      }
    },
    [updateExchange]
  );

  useEffect(() => {
    EXCHANGE_NAMES.forEach((name) => checkConnection(name));
  }, [checkConnection]);

  const connect = async (name: ExchangeName, apiKey: string, secret: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/exchange/${name}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, secret }),
      });
      const data = await res.json();
      if (data.success) {
        await checkConnection(name);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const disconnect = async (name: ExchangeName) => {
    await fetch(`/api/exchange/${name}/keys`, { method: 'DELETE' });
    updateExchange(name, {
      connected: false,
      apiKeyPreview: '',
      positions: [],
      totalValue: 0,
    });
  };

  const refreshPortfolio = async (name: ExchangeName) => {
    if (!exchangeStates[name].connected) return;
    updateExchange(name, { loading: true });
    try {
      const res = await fetch(`/api/exchange/${name}/portfolio`);
      if (res.ok) {
        const data = await res.json();
        updateExchange(name, {
          positions: data.positions || [],
          totalValue: data.totalValue || 0,
        });
      }
    } catch {
      // Portfolio fetch failed
    } finally {
      updateExchange(name, { loading: false });
    }
  };

  const active = exchangeStates[activeExchange];
  const connectedExchanges = EXCHANGE_NAMES.filter((n) => exchangeStates[n].connected);

  // Aggregate positions across all connected exchanges
  const allPositions = EXCHANGE_NAMES.flatMap((n) => exchangeStates[n].positions);
  const allTotalValue = EXCHANGE_NAMES.reduce((sum, n) => sum + exchangeStates[n].totalValue, 0);

  return (
    <ExchangeContext.Provider
      value={{
        exchanges: exchangeStates,
        activeExchange,
        setActiveExchange,
        connect,
        disconnect,
        refreshPortfolio,
        // Backwards compat — returns active exchange state
        connected: active.connected,
        apiKeyPreview: active.apiKeyPreview,
        positions: active.positions,
        totalValue: active.totalValue,
        loading: active.loading,
        allPositions,
        allTotalValue,
        connectedExchanges,
      }}
    >
      {children}
    </ExchangeContext.Provider>
  );
}

export const useExchange = () => useContext(ExchangeContext);

// Backwards-compatible alias
export const useBinance = () => {
  const ctx = useContext(ExchangeContext);
  return {
    connected: ctx.exchanges.binance.connected || ctx.exchanges.coinbase.connected,
    apiKeyPreview: ctx.exchanges.binance.apiKeyPreview || ctx.exchanges.coinbase.apiKeyPreview,
    positions: ctx.allPositions,
    totalValue: ctx.allTotalValue,
    loading: ctx.exchanges.binance.loading || ctx.exchanges.coinbase.loading,
    connect: (apiKey: string, secret: string) => ctx.connect('binance', apiKey, secret),
    disconnect: () => ctx.disconnect('binance'),
    refreshPortfolio: () => ctx.refreshPortfolio('binance'),
  };
};
