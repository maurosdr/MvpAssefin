'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  AreaChart,
  LineChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MAIN_STOCKS, STOCK_NAMES } from '@/lib/stocks-data';

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

const COMPARISON_COLORS = ['#22c55e', '#3b82f6', '#f59e0b'];

export default function StockChart({ availableStocks }: StockChartProps) {
  const [selectedStocks, setSelectedStocks] = useState<string[]>([availableStocks[0]?.symbol || 'PETR4']);
  const [timeWindow, setTimeWindow] = useState('1mo');
  const [stockDataMap, setStockDataMap] = useState<Record<string, StockData>>({});
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // All known stocks for search
  const allStocks = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of availableStocks) map.set(s.symbol, s.name);
    for (const sym of MAIN_STOCKS) {
      if (!map.has(sym)) map.set(sym, STOCK_NAMES[sym] || sym);
    }
    return Array.from(map.entries()).map(([symbol, name]) => ({ symbol, name }));
  }, [availableStocks]);

  const searchResults = useMemo(() => {
    if (searchInput.length < 1) return [];
    const q = searchInput.toUpperCase();
    return allStocks
      .filter((s) => !selectedStocks.includes(s.symbol) && (s.symbol.includes(q) || s.name.toUpperCase().includes(q)))
      .slice(0, 8);
  }, [searchInput, allStocks, selectedStocks]);

  const fetchData = useCallback(async () => {
    if (selectedStocks.length === 0) return;

    setLoading(true);
    try {
      const rangeMap: Record<string, string> = {
        '1d': '1d', '5d': '5d', '1mo': '1mo', '3mo': '3mo', '6mo': '6mo', '1y': '1y',
      };
      const intervalMap: Record<string, string> = {
        '1d': '5m', '5d': '1h', '1mo': '1d', '3mo': '1d', '6mo': '1d', '1y': '1wk',
      };

      const range = rangeMap[timeWindow] || '1mo';
      const interval = intervalMap[timeWindow] || '1d';

      const results: Record<string, StockData> = {};
      await Promise.all(
        selectedStocks.map(async (sym) => {
          try {
            const res = await fetch(
              `/api/stocks/quote?symbol=${sym}&range=${range}&interval=${interval}`,
              { cache: 'no-store' }
            );
            const stockData = await res.json();
            if (stockData.data && Array.isArray(stockData.data)) {
              results[sym] = stockData;
            }
          } catch {
            // skip failed fetch
          }
        })
      );
      setStockDataMap(results);
    } catch {
      setStockDataMap({});
    } finally {
      setLoading(false);
    }
  }, [selectedStocks, timeWindow]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addStock = (sym: string) => {
    if (selectedStocks.length < 3 && !selectedStocks.includes(sym)) {
      setSelectedStocks([...selectedStocks, sym]);
    }
    setSearchInput('');
    setShowDropdown(false);
  };

  const removeStock = (sym: string) => {
    if (selectedStocks.length > 1) {
      setSelectedStocks(selectedStocks.filter((s) => s !== sym));
    }
  };

  const isComparing = selectedStocks.length > 1;
  const primaryData = stockDataMap[selectedStocks[0]];
  const hasData = Object.keys(stockDataMap).length > 0 && primaryData?.data?.length > 0;

  const chartData = useMemo(() => {
    if (!hasData) return [];

    if (!isComparing) {
      return primaryData.data.map((item) => ({
        date: item.date,
        price: item.close,
      }));
    }

    // Multi-stock: normalized index starting at 1.0
    return primaryData.data.map((item, idx) => {
      const point: Record<string, unknown> = { date: item.date };
      for (const sym of selectedStocks) {
        const d = stockDataMap[sym];
        if (d?.data?.[idx] && d.data[0]?.close > 0) {
          point[sym] = d.data[idx].close / d.data[0].close;
        }
      }
      return point;
    });
  }, [stockDataMap, selectedStocks, isComparing, primaryData, hasData]);

  if (!hasData) {
    return (
      <div className="modern-card">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[var(--border)]">
          <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
          <h2 className="section-title">Preco Historico</h2>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          {loading ? (
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <p className="text-[var(--text-muted)]">Nenhum dado disponivel</p>
          )}
        </div>
      </div>
    );
  }

  const priceChange = primaryData.changePercent;
  const isPositive = priceChange >= 0;

  // Single stock Y-axis bounds
  const chartPrices = !isComparing ? chartData.map((d) => (d as { price: number }).price).filter((p) => p > 0) : [];
  const priceMin = chartPrices.length > 0 ? Math.min(...chartPrices) * 0.98 : 0;
  const priceMax = chartPrices.length > 0 ? Math.max(...chartPrices) * 1.02 : 0;

  return (
    <div className="modern-card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-4 border-b border-[var(--border)] gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
          <div>
            <h2 className="section-title">Preco Historico</h2>
            {!isComparing && (
              <div className="flex items-center gap-4 mt-1">
                <span className="data-value text-lg font-bold text-[var(--text-primary)]">
                  {primaryData.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className={`data-value font-semibold ${isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Time Windows */}
        <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1">
          {['1d', '5d', '1mo', '3mo', '6mo', '1y'].map((w) => (
            <button
              key={w}
              onClick={() => setTimeWindow(w)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                timeWindow === w
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {w.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Selection */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {selectedStocks.map((sym, idx) => (
          <span
            key={sym}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
            style={{
              backgroundColor: COMPARISON_COLORS[idx] + '20',
              color: COMPARISON_COLORS[idx],
              border: `1px solid ${COMPARISON_COLORS[idx]}40`,
            }}
          >
            {sym}
            {selectedStocks.length > 1 && (
              <button onClick={() => removeStock(sym)} className="ml-1 hover:opacity-70 text-sm">&times;</button>
            )}
          </span>
        ))}
        {selectedStocks.length < 3 && (
          <div className="relative" ref={searchRef}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value.toUpperCase());
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Adicionar ticker..."
              className="px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] w-40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 w-56 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {searchResults.map((s) => (
                  <button
                    key={s.symbol}
                    onClick={() => addStock(s.symbol)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <span className="font-mono font-bold">{s.symbol}</span>
                    <span className="text-[var(--text-muted)] ml-2">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {isComparing && (
          <span className="text-[10px] text-[var(--text-muted)] ml-2">Retorno normalizado (base 1.0)</span>
        )}
      </div>

      {/* Chart */}
      <div className="h-[400px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          {isComparing ? (
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.toFixed(2)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0b0f19',
                  border: '1px solid #1f2937',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                }}
                formatter={(value, name) => {
                  const v = Number(value) || 0;
                  return [`${((v - 1) * 100).toFixed(2)}%`, name];
                }}
              />
              {selectedStocks.map((sym, idx) => (
                <Line
                  key={sym}
                  type="linear"
                  dataKey={sym}
                  stroke={COMPARISON_COLORS[idx]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          ) : (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#f85149'} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={isPositive ? '#22c55e' : '#f85149'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[priceMin, priceMax]}
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
                  if (typeof value !== 'number') return ['-', 'Preco'];
                  return [
                    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    'Preco',
                  ];
                }}
              />
              <Area
                type="linear"
                dataKey="price"
                stroke={isPositive ? '#22c55e' : '#f85149'}
                strokeWidth={2}
                fill="url(#stockGrad)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
