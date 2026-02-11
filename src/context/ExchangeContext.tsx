'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { BinancePosition, BookEntry } from '@/types/crypto';

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
  refreshAllPortfolios: () => void;
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
  // Consolidated Book
  book: BookEntry[];
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
  refreshAllPortfolios: () => {},
  connected: false,
  apiKeyPreview: '',
  positions: [],
  totalValue: 0,
  loading: false,
  allPositions: [],
  allTotalValue: 0,
  connectedExchanges: [],
  book: [],
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
        const res = await fetch(`/api/exchange/${name}/keys`);
        const data = await res.json();
        updateExchange(name, {
          connected: data.connected || false,
          apiKeyPreview: data.apiKeyPreview || '',
        });
      } catch {
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

  const refreshPortfolio = useCallback(async (name: ExchangeName) => {
    if (!exchangeStates[name].connected) return;
    updateExchange(name, { loading: true });
    try {
      const res = await fetch(`/api/exchange/${name}/portfolio`);
      if (res.ok) {
        const data = await res.json();
        // Tag each position with its exchange source
        const taggedPositions = (data.positions || []).map((p: BinancePosition) => ({
          ...p,
          exchange: name,
        }));
        updateExchange(name, {
          positions: taggedPositions,
          totalValue: data.totalValue || 0,
        });
      }
    } catch {
      // Portfolio fetch failed
    } finally {
      updateExchange(name, { loading: false });
    }
  }, [exchangeStates, updateExchange]);

  const connectedExchanges = EXCHANGE_NAMES.filter((n) => exchangeStates[n].connected);

  const refreshAllPortfolios = useCallback(() => {
    connectedExchanges.forEach((name) => refreshPortfolio(name));
  }, [connectedExchanges, refreshPortfolio]);

  const active = exchangeStates[activeExchange];

  // Flat aggregate of all positions (tagged with exchange)
  const allPositions = EXCHANGE_NAMES.flatMap((n) => exchangeStates[n].positions);
  const allTotalValue = EXCHANGE_NAMES.reduce((sum, n) => sum + exchangeStates[n].totalValue, 0);

  // Consolidated Book: merge same-asset across exchanges
  const book = useMemo<BookEntry[]>(() => {
    const map = new Map<string, BookEntry>();

    for (const name of EXCHANGE_NAMES) {
      for (const pos of exchangeStates[name].positions) {
        const existing = map.get(pos.asset);
        const entry = {
          exchange: pos.exchange || name,
          free: pos.free,
          locked: pos.locked,
          total: pos.total,
          usdValue: pos.usdValue,
        };

        if (existing) {
          existing.totalAmount += pos.total;
          existing.totalUsdValue += pos.usdValue;
          existing.exchanges.push(entry);
        } else {
          map.set(pos.asset, {
            asset: pos.asset,
            totalAmount: pos.total,
            totalUsdValue: pos.usdValue,
            exchanges: [entry],
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalUsdValue - a.totalUsdValue);
  }, [exchangeStates]);

  return (
    <ExchangeContext.Provider
      value={{
        exchanges: exchangeStates,
        activeExchange,
        setActiveExchange,
        connect,
        disconnect,
        refreshPortfolio,
        refreshAllPortfolios,
        connected: active.connected,
        apiKeyPreview: active.apiKeyPreview,
        positions: active.positions,
        totalValue: active.totalValue,
        loading: active.loading,
        allPositions,
        allTotalValue,
        connectedExchanges,
        book,
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
    connected: ctx.connectedExchanges.length > 0,
    apiKeyPreview: ctx.exchanges.binance.apiKeyPreview || ctx.exchanges.coinbase.apiKeyPreview,
    positions: ctx.allPositions,
    totalValue: ctx.allTotalValue,
    loading: ctx.exchanges.binance.loading || ctx.exchanges.coinbase.loading,
    connect: (apiKey: string, secret: string) => ctx.connect('binance', apiKey, secret),
    disconnect: () => ctx.disconnect('binance'),
    refreshPortfolio: () => ctx.refreshAllPortfolios(),
  };
};
