'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import { getStockLogoUrl, getStockInitials } from '@/lib/stock-logos';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface StockDetail {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  data: Array<{
    date: string;
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params.symbol as string;
  const [stock, setStock] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState('1mo');
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const fetchStock = async () => {
      setLoading(true);
      try {
        const rangeMap: Record<string, string> = {
          '1d': '1d',
          '5d': '5d',
          '1mo': '1mo',
          '3mo': '3mo',
          '6mo': '6mo',
          '1y': '1y',
        };

        const intervalMap: Record<string, string> = {
          '1d': '5m',
          '5d': '1h',
          '1mo': '1d',
          '3mo': '1d',
          '6mo': '1d',
          '1y': '1wk',
        };

        const range = rangeMap[window] || '1mo';
        const interval = intervalMap[window] || '1d';

        const res = await fetch(
          `/api/stocks/quote?symbol=${symbol}&range=${range}&interval=${interval}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        
        if (data.data && Array.isArray(data.data)) {
          setStock(data);
        }
      } catch {
        setStock(null);
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      fetchStock();
    }
  }, [symbol, window]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <MarketTickerBar />
        <AppHeader />
        <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[var(--text-muted)]">Carregando dados de {symbol}...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <MarketTickerBar />
        <AppHeader />
        <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-[var(--text-muted)] mb-4">Ação não encontrada</p>
              <button
                onClick={() => router.push('/stocks')}
                className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg font-semibold hover:bg-[var(--accent-hover)] transition-colors"
              >
                Voltar para Ações
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isPositive = stock.changePercent >= 0;
  const chartData = stock.data.map((item) => ({
    date: item.date,
    price: item.close,
    volume: item.volume,
    high: item.high,
    low: item.low,
    open: item.open,
  }));

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/stocks')}
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {/* Logo da empresa */}
            <div className="w-16 h-16 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center overflow-hidden shadow-sm">
              {getStockLogoUrl(symbol) && !logoError ? (
                <img
                  src={getStockLogoUrl(symbol)}
                  alt={stock.name}
                  className="w-full h-full object-contain p-2"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-primary)] font-bold text-lg">
                  {getStockInitials(symbol)}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">{stock.name}</h1>
              <p className="text-[var(--text-muted)]">{stock.symbol} • B3</p>
            </div>
          </div>
          <div className="text-right">
            <div className="data-value text-3xl font-bold text-[var(--text-primary)] mb-1">
              {stock.currentPrice.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
            <div
              className={`data-value text-xl font-semibold ${
                isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
              }`}
            >
              {isPositive ? '+' : ''}
              {stock.changePercent.toFixed(2)}% ({isPositive ? '+' : ''}
              {stock.change.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })})
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="modern-card p-4">
            <div className="text-xs text-[var(--text-muted)] mb-1">Abertura</div>
            <div className="data-value text-lg font-bold text-[var(--text-primary)]">
              {stock.open?.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }) || '-'}
            </div>
          </div>
          <div className="modern-card p-4">
            <div className="text-xs text-[var(--text-muted)] mb-1">Máxima</div>
            <div className="data-value text-lg font-bold text-[var(--success)]">
              {stock.high?.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }) || '-'}
            </div>
          </div>
          <div className="modern-card p-4">
            <div className="text-xs text-[var(--text-muted)] mb-1">Mínima</div>
            <div className="data-value text-lg font-bold text-[var(--danger)]">
              {stock.low?.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }) || '-'}
            </div>
          </div>
          <div className="modern-card p-4">
            <div className="text-xs text-[var(--text-muted)] mb-1">Fechamento Anterior</div>
            <div className="data-value text-lg font-bold text-[var(--text-primary)]">
              {stock.previousClose?.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }) || '-'}
            </div>
          </div>
        </div>

        {/* Volume & Market Cap */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="modern-card p-4">
            <div className="text-xs text-[var(--text-muted)] mb-1">Volume</div>
            <div className="data-value text-xl font-bold text-[var(--text-primary)]">
              {stock.volume && stock.volume > 0
                ? stock.volume > 1e9
                  ? `${(stock.volume / 1e9).toFixed(2)}B`
                  : stock.volume > 1e6
                  ? `${(stock.volume / 1e6).toFixed(2)}M`
                  : stock.volume.toLocaleString('pt-BR')
                : '-'}
            </div>
          </div>
          {stock.marketCap && (
            <div className="modern-card p-4">
              <div className="text-xs text-[var(--text-muted)] mb-1">Market Cap</div>
              <div className="data-value text-xl font-bold text-[var(--text-primary)]">
                {stock.marketCap > 1e12
                  ? `R$ ${(stock.marketCap / 1e12).toFixed(2)}T`
                  : stock.marketCap > 1e9
                  ? `R$ ${(stock.marketCap / 1e9).toFixed(2)}B`
                  : `R$ ${(stock.marketCap / 1e6).toFixed(2)}M`}
              </div>
            </div>
          )}
        </div>

        {/* Price Chart */}
        <div className="modern-card">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
              <h2 className="section-title">Gráfico de Preços</h2>
            </div>
            <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1">
              {['1d', '5d', '1mo', '3mo', '6mo', '1y'].map((w) => (
                <button
                  key={w}
                  onClick={() => setWindow(w)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    window === w
                      ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-md'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {w.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[400px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isPositive ? '#22c55e' : '#f85149'}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor={isPositive ? '#22c55e' : '#f85149'}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$ ${v.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b0f19',
                    border: '1px solid #1f2937',
                    borderRadius: '0.75rem',
                    fontSize: '0.75rem',
                  }}
                  formatter={(value) => {
                    if (typeof value !== 'number') return ['-', 'Preço'];
                    return [
                      value.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }),
                      'Preço',
                    ];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={isPositive ? '#22c55e' : '#f85149'}
                  strokeWidth={2}
                  fill="url(#priceGrad)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Volume Chart */}
        <div className="modern-card">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
            <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
            <h2 className="section-title">Volume de Negociação</h2>
          </div>
          <div className="h-[300px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => {
                    if (v > 1e9) return `${(v / 1e9).toFixed(1)}B`;
                    if (v > 1e6) return `${(v / 1e6).toFixed(1)}M`;
                    return `${(v / 1e3).toFixed(0)}K`;
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b0f19',
                    border: '1px solid #1f2937',
                    borderRadius: '0.75rem',
                    fontSize: '0.75rem',
                  }}
                  formatter={(value) => {
                    if (typeof value !== 'number') return ['-', 'Volume'];
                    return [value.toLocaleString('pt-BR'), 'Volume'];
                  }}
                />
                <Bar
                  dataKey="volume"
                  fill="var(--accent)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}

