'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getStockLogoUrl, getStockInitials } from '@/lib/stock-logos';

interface StockRow {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high?: number;
  low?: number;
  logoUrl?: string;
}

function StockRowWithLogo({
  stock,
  isPositive,
  formatPrice,
  router,
}: {
  stock: StockRow;
  isPositive: boolean;
  formatPrice: (p: number) => string;
  router: ReturnType<typeof useRouter>;
}) {
  const [logoError, setLogoError] = useState(false);
  const logoUrl = stock.logoUrl || getStockLogoUrl(stock.symbol);

  return (
    <tr
      className="group hover:bg-[var(--surface-hover)] transition-all cursor-pointer relative"
    >
      <td className="py-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-[var(--accent)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          {/* Logo da empresa */}
          <div className="w-10 h-10 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt={stock.name}
                className="w-full h-full object-contain p-1.5"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-primary)] font-bold text-xs">
                {getStockInitials(stock.symbol)}
              </div>
            )}
          </div>
          <div>
            <div className="font-bold text-[var(--text-primary)] text-sm">{stock.symbol}</div>
            <div className="text-xs text-[var(--text-muted)] line-clamp-1">{stock.name}</div>
          </div>
        </div>
      </td>
      <td className="py-4 text-right">
        <span className="data-value text-[var(--text-primary)] font-bold">
          {formatPrice(stock.price)}
        </span>
      </td>
      <td className="py-4 text-right">
        <span
          className={`data-value font-bold ${
            isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
          }`}
        >
          {isPositive ? '+' : ''}
          {stock.changePercent.toFixed(2)}%
        </span>
      </td>
      <td className="py-4 text-right">
        <span
          className={`data-value text-sm ${
            isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
          }`}
        >
          {isPositive ? '+' : ''}
          {formatPrice(stock.change)}
        </span>
      </td>
      <td className="py-4 text-right">
        <span className="data-value text-[var(--text-secondary)] text-xs">
          {stock.volume > 1e6
            ? `${(stock.volume / 1e6).toFixed(1)}M`
            : stock.volume > 1e3
            ? `${(stock.volume / 1e3).toFixed(1)}K`
            : stock.volume.toLocaleString('pt-BR')}
        </span>
      </td>
      <td className="py-4 text-right">
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/stocks/${stock.symbol}`);
          }}
          className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-[var(--accent-soft)] text-[var(--accent)] rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:bg-[var(--accent)] hover:text-[var(--text-inverse)] hover:scale-105 active:scale-95"
        >
          VER
        </button>
      </td>
    </tr>
  );
}

export default function StocksTable({ data }: { data: StockRow[] }) {
  const router = useRouter();
  const top10 = data.slice(0, 10);

  const formatPrice = (p: number) =>
    `R$ ${p.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalVolume = data.reduce((sum, s) => sum + s.volume, 0);
  const totalMarketCap = data.reduce((sum, s) => sum + (s.marketCap || 0), 0);

  return (
    <div className="modern-card h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-1 h-8 bg-gradient-to-b from-[var(--accent)] to-[var(--accent-strong)] rounded-full" />
            <div className="absolute top-0 left-0 w-1 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="section-title text-[var(--accent)] mb-1 flex items-center gap-2">
              <span>B3 - BOLSA DE VALORES</span>
              <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" />
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="data-value text-[var(--text-secondary)]">
                VOL: <span className="text-[var(--text-primary)] font-bold">R$ {(totalVolume / 1e9).toFixed(1)}B</span>
              </span>
              <span className="text-[var(--border-strong)]">|</span>
              <span className="data-value text-[var(--text-secondary)]">
                MKT CAP: <span className="text-[var(--text-primary)] font-bold">R$ {(totalMarketCap / 1e12).toFixed(1)}T</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--success-soft)] to-[var(--success-soft)]/50 border border-[var(--success)]/30 rounded-lg shadow-sm">
          <span className="relative">
            <span className="w-2 h-2 bg-[var(--success)] rounded-full animate-pulse" />
            <span className="absolute inset-0 w-2 h-2 bg-[var(--success)] rounded-full animate-ping opacity-75" />
          </span>
          <span className="text-xs font-bold text-[var(--success)] uppercase tracking-wider">LIVE</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)] border-b-2 border-[var(--border)]">
              <th className="pb-4 text-left">AÇÃO</th>
              <th className="pb-4 text-right">PREÇO</th>
              <th className="pb-4 text-right">VAR %</th>
              <th className="pb-4 text-right">VAR R$</th>
              <th className="pb-4 text-right">VOLUME</th>
              <th className="pb-4 text-right w-20"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-subtle)]">
            {top10.map((stock) => {
              const isPositive = stock.changePercent >= 0;
              return (
                <StockRowWithLogo
                  key={stock.symbol}
                  stock={stock}
                  isPositive={isPositive}
                  formatPrice={formatPrice}
                  router={router}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

