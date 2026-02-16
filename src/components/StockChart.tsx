'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
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

interface StockChartProps {
  availableStocks: Array<{ symbol: string; name: string }>;
}

export default function StockChart({ availableStocks }: StockChartProps) {
  const [selected, setSelected] = useState(availableStocks[0]?.symbol || 'PETR4');
  const [window, setWindow] = useState('1mo');
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!selected) return;
    
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
        `/api/stocks/quote?symbol=${selected}&range=${range}&interval=${interval}`,
        { cache: 'no-store' }
      );
      const stockData = await res.json();
      
      if (stockData.data && Array.isArray(stockData.data)) {
        setData(stockData);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selected, window]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="modern-card">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[var(--border)]">
          <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
          <h2 className="section-title">Gráfico de Ações</h2>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          {loading ? (
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <p className="text-[var(--text-muted)]">Nenhum dado disponível</p>
          )}
        </div>
      </div>
    );
  }

  const priceChange = data.changePercent;
  const isPositive = priceChange >= 0;

  const chartData = data.data.map((item) => ({
    date: item.date,
    price: item.close,
    volume: item.volume,
  }));

  return (
    <div className="modern-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
          <div>
            <h2 className="section-title">{data.name || selected}</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="data-value text-lg font-bold text-[var(--text-primary)]">
                {data.currentPrice.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </span>
              <span
                className={`data-value font-semibold ${
                  isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                }`}
              >
                {isPositive ? '+' : ''}
                {priceChange.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Stock Selector */}
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {availableStocks.map((stock) => (
              <option key={stock.symbol} value={stock.symbol}>
                {stock.symbol} - {stock.name}
              </option>
            ))}
          </select>

          {/* Time Windows */}
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
      </div>

      {/* Chart */}
      <div className="h-[400px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
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
              fill="url(#stockGrad)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


