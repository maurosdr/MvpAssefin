'use client';

import { useEffect, useState } from 'react';
import type { TickerItem } from '@/app/api/market/ticker/route';

function formatPrice(item: TickerItem): string {
  if (item.type === 'index' && item.currency === 'BRL') {
    // IBOV — sem casas decimais, sem símbolo
    return item.price.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }
  if (item.type === 'stock') {
    // Ações B3 em R$
    return `R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  // USD (S&P, Nasdaq, BTC)
  return `$${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function TickerEntry({ item }: { item: TickerItem }) {
  const up = item.changePercent >= 0;
  return (
    <div className="flex items-center gap-3 shrink-0">
      <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
        {item.symbol}
      </span>
      <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
        {formatPrice(item)}
      </span>
      <span className={`text-xs font-bold ${up ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
        {up ? '▲' : '▼'} {Math.abs(item.changePercent).toFixed(2)}%
      </span>
    </div>
  );
}

export default function MarketTickerBar() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/market/ticker', { cache: 'no-store' });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchData, 100);
    const interval = setInterval(fetchData, 30_000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-10 bg-[var(--bg-elevated)] border-b border-[var(--border)] flex items-center px-4">
        <div className="w-full h-4 bg-[var(--surface)]/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-10 bg-[var(--bg-elevated)] border-b border-[var(--border)] overflow-hidden relative z-50">
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-elevated)] via-transparent to-[var(--bg-elevated)] z-10 pointer-events-none" />
      <div className="flex items-center h-full animate-scroll">
        <div className="flex items-center gap-8 px-6 whitespace-nowrap">
          {items.map((item, i) => <TickerEntry key={`a-${i}`} item={item} />)}
          {/* Duplicate for seamless loop */}
          {items.map((item, i) => <TickerEntry key={`b-${i}`} item={item} />)}
        </div>
      </div>
    </div>
  );
}
