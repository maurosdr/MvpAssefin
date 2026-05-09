'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useSession } from 'next-auth/react';
import { ManualPosition } from '@/types/portfolio';

interface PortfolioContextType {
  positions: ManualPosition[];
  /** Carregamento inicial da API (ou migração). */
  syncing: boolean;
  addPosition: (position: Omit<ManualPosition, 'id'>) => Promise<void>;
  removePosition: (id: string) => Promise<void>;
  updatePosition: (id: string, updates: Partial<ManualPosition>) => Promise<void>;
  refreshCurrentPrices: () => Promise<void>;
  loading: boolean;
}

const PortfolioContext = createContext<PortfolioContextType>({
  positions: [],
  syncing: false,
  addPosition: async () => {},
  removePosition: async () => {},
  updatePosition: async () => {},
  refreshCurrentPrices: async () => {},
  loading: false,
});

const STORAGE_KEY = 'assefin_portfolio_positions';
const IMPORT_DONE_KEY = 'assefin_portfolio_db_import_done';

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [positions, setPositions] = useState<ManualPosition[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || status === 'loading') return;

    if (status !== 'authenticated' || !session?.user?.id) {
      setPositions([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setSyncing(true);
      try {
        const res = await fetch('/api/portfolio/positions');
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { positions?: ManualPosition[] };
        let list = data.positions ?? [];

        if (list.length === 0 && typeof window !== 'undefined') {
          try {
            const done = localStorage.getItem(IMPORT_DONE_KEY);
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw && !done) {
              const parsed = JSON.parse(raw) as unknown;
              if (Array.isArray(parsed) && parsed.length > 0) {
                const payload = parsed.map((p: ManualPosition) => ({
                  type: p.type,
                  symbol: p.symbol,
                  name: p.name,
                  entryDate: p.entryDate,
                  entryPrice: p.entryPrice,
                  quantity: p.quantity,
                  currentPrice: p.currentPrice,
                  side: p.side,
                  market: p.market,
                }));
                const imp = await fetch('/api/portfolio/positions/import', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ positions: payload }),
                });
                if (imp.ok) {
                  localStorage.removeItem(STORAGE_KEY);
                  localStorage.setItem(IMPORT_DONE_KEY, '1');
                  const again = await fetch('/api/portfolio/positions');
                  if (again.ok && !cancelled) {
                    const d2 = (await again.json()) as { positions?: ManualPosition[] };
                    list = d2.positions ?? [];
                  }
                }
              }
            }
          } catch {
            // migração opcional
          }
        }

        if (!cancelled) setPositions(list);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, status, session?.user?.id]);

  const addPosition = useCallback(
    async (position: Omit<ManualPosition, 'id'>) => {
      if (status !== 'authenticated') {
        throw new Error('Faça login para salvar na carteira.');
      }

      const res = await fetch('/api/portfolio/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(position),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Erro ao salvar posição');
      }

      const data = (await res.json()) as { position: ManualPosition };
      setPositions((prev) => [...prev, data.position]);
    },
    [status]
  );

  const removePosition = useCallback(async (id: string) => {
    const res = await fetch(`/api/portfolio/positions/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? 'Erro ao remover');
    }
    setPositions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePosition = useCallback(async (id: string, updates: Partial<ManualPosition>) => {
    const res = await fetch(`/api/portfolio/positions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { position: ManualPosition };
    setPositions((prev) => prev.map((p) => (p.id === id ? data.position : p)));
  }, []);

  const refreshCurrentPrices = useCallback(async () => {
    if (positions.length === 0 || status !== 'authenticated') return;
    setLoading(true);

    try {
      const stockPositions = positions.filter(
        (p) => p.type !== 'prediction' && p.type !== 'crypto'
      );
      const uniqueSymbols = [...new Set(stockPositions.map((p) => p.symbol))];

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

      const updates = positions.flatMap((p) => {
        const currentPrice = priceMap.get(p.symbol);
        if (currentPrice === undefined) return [];
        return [{ id: p.id, currentPrice }];
      });

      if (updates.length === 0) return;

      const patchRes = await fetch('/api/portfolio/positions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (patchRes.ok) {
        const data = (await patchRes.json()) as { positions?: ManualPosition[] };
        if (data.positions) setPositions(data.positions);
      }
    } catch {
      // falha silenciosa na cotação
    } finally {
      setLoading(false);
    }
  }, [positions, status]);

  const value = useMemo(
    () => ({
      positions,
      syncing,
      addPosition,
      removePosition,
      updatePosition,
      refreshCurrentPrices,
      loading,
    }),
    [positions, syncing, addPosition, removePosition, updatePosition, refreshCurrentPrices, loading]
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export const usePortfolio = () => useContext(PortfolioContext);
