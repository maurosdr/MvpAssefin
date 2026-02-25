'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { PortfolioAsset, PortfolioSnapshot, PortfolioRiskMetrics, PortfolioSummary } from '@/types/portfolio';
import { useExchange } from '@/context/ExchangeContext';

interface PortfolioContextType {
  summary: PortfolioSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  timeRange: '1w' | '1m' | '3m' | '6m' | '1y' | 'all';
  setTimeRange: (range: '1w' | '1m' | '3m' | '6m' | '1y' | 'all') => void;
}

const PortfolioContext = createContext<PortfolioContextType>({
  summary: null,
  loading: false,
  error: null,
  refresh: async () => {},
  timeRange: '1m',
  setTimeRange: () => {},
});

export function usePortfolio() {
  return useContext(PortfolioContext);
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { connectedExchanges, allPositions, allTotalValue } = useExchange();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PortfolioSnapshot[]>([]);
  const [timeRange, setTimeRange] = useState<'1w' | '1m' | '3m' | '6m' | '1y' | 'all'>('1m');

  const refresh = useCallback(async () => {
    if (connectedExchanges.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio/historical?range=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch {
      setError('Failed to load portfolio history');
    } finally {
      setLoading(false);
    }
  }, [connectedExchanges.length, timeRange]);

  const summary = useMemo((): PortfolioSummary | null => {
    if (allPositions.length === 0) return null;

    const assets: PortfolioAsset[] = allPositions
      .filter((p) => p.usdValue > 0.01)
      .map((p) => ({
        symbol: p.asset,
        name: p.asset,
        type: 'crypto' as const,
        quantity: p.total,
        avgPrice: 0,
        currentPrice: p.total > 0 ? p.usdValue / p.total : 0,
        value: p.usdValue,
        allocation: allTotalValue > 0 ? (p.usdValue / allTotalValue) * 100 : 0,
        pnl: 0,
        pnlPercent: 0,
      }))
      .sort((a, b) => b.value - a.value);

    const allocationMap = new Map<string, number>();
    for (const asset of assets) {
      const current = allocationMap.get(asset.type) || 0;
      allocationMap.set(asset.type, current + asset.value);
    }
    const allocation = Array.from(allocationMap.entries()).map(([type, value]) => ({
      type,
      value,
      percentage: allTotalValue > 0 ? (value / allTotalValue) * 100 : 0,
    }));

    // Calculate risk metrics from history
    const returns: number[] = [];
    for (let i = 1; i < history.length; i++) {
      if (history[i - 1].totalValue > 0) {
        returns.push((history[i].totalValue - history[i - 1].totalValue) / history[i - 1].totalValue);
      }
    }

    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 1
      ? returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / (returns.length - 1)
      : 0;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
    const sharpeRatio = volatility > 0 ? (avgReturn * 252 - 0.05) / (volatility / 100) : 0;

    // Max drawdown
    let maxDrawdown = 0;
    let peak = 0;
    for (const snap of history) {
      if (snap.totalValue > peak) peak = snap.totalValue;
      if (peak > 0) {
        const drawdown = (peak - snap.totalValue) / peak;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }
    }

    const riskMetrics: PortfolioRiskMetrics = {
      totalValue: allTotalValue,
      dailyReturn: avgReturn * 100,
      sharpeRatio,
      maxDrawdown: maxDrawdown * 100,
      volatility,
      beta: 1.0,
    };

    return {
      totalValue: allTotalValue,
      totalPnl: 0,
      totalPnlPercent: 0,
      assetCount: assets.length,
      assets,
      riskMetrics,
      history,
      allocation,
    };
  }, [allPositions, allTotalValue, history]);

  return (
    <PortfolioContext.Provider value={{ summary, loading, error, refresh, timeRange, setTimeRange }}>
      {children}
    </PortfolioContext.Provider>
  );
}
