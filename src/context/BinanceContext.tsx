'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BinancePosition } from '@/types/crypto';

interface BinanceContextType {
  connected: boolean;
  apiKeyPreview: string;
  positions: BinancePosition[];
  totalValue: number;
  loading: boolean;
  connect: (apiKey: string, secret: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  refreshPortfolio: () => Promise<void>;
}

const BinanceContext = createContext<BinanceContextType>({
  connected: false,
  apiKeyPreview: '',
  positions: [],
  totalValue: 0,
  loading: false,
  connect: async () => false,
  disconnect: async () => {},
  refreshPortfolio: async () => {},
});

export function BinanceProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [apiKeyPreview, setApiKeyPreview] = useState('');
  const [positions, setPositions] = useState<BinancePosition[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/binance/keys');
      const data = await res.json();
      setConnected(data.connected || false);
      setApiKeyPreview(data.apiKeyPreview || '');
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connect = async (apiKey: string, secret: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/binance/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, secret }),
      });
      const data = await res.json();
      if (data.success) {
        await checkConnection();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const disconnect = async () => {
    await fetch('/api/binance/keys', { method: 'DELETE' });
    setConnected(false);
    setApiKeyPreview('');
    setPositions([]);
    setTotalValue(0);
  };

  const refreshPortfolio = async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const res = await fetch('/api/binance/portfolio');
      if (res.ok) {
        const data = await res.json();
        setPositions(data.positions || []);
        setTotalValue(data.totalValue || 0);
      }
    } catch {
      // Portfolio fetch failed
    } finally {
      setLoading(false);
    }
  };

  return (
    <BinanceContext.Provider
      value={{
        connected,
        apiKeyPreview,
        positions,
        totalValue,
        loading,
        connect,
        disconnect,
        refreshPortfolio,
      }}
    >
      {children}
    </BinanceContext.Provider>
  );
}

export const useBinance = () => useContext(BinanceContext);
