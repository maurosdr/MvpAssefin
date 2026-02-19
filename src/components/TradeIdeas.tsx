'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  ReferenceLine,
  ComposedChart,
  Scatter,
  Cell,
} from 'recharts';
import { useStopLoss } from '@/context/StopLossContext';

// ─── Types ────────────────────────────────────────────────────────
type Section = 'market-cycle' | 'ratio-indicators' | 'risk-manager';

interface TradeIdeasProps {
  symbol: string;
  currentPrice?: number;
}

// ─── Heatmap & NVT data types ────────────────────────────────────
interface HeatmapDataPoint {
  date: string;
  week: number;
  price: number;
  ma200w: number;
  monthlyChange: number;
}

interface NVTDataPoint {
  date: string;
  price: number;
  nvt: number;
  nvtMean: number;
  upper: number;
  lower: number;
  zone: 'overbought' | 'oversold' | 'neutral';
}

interface StopLossSimView {
  type: 'atr' | 'technical' | 'trailing' | 'ratio';
  label: string;
}

// ─── Monte Carlo result types ─────────────────────────────────────
interface MonteCarloResult {
  paths: number[][];
  cvar95: number;
  cvar99: number;
  maxDrawdown: number;
  meanReturn: number;
  medianReturn: number;
  percentile5: number;
  percentile95: number;
}

// ─── Component ────────────────────────────────────────────────────
export default function TradeIdeas({ symbol, currentPrice }: TradeIdeasProps) {
  const [activeSection, setActiveSection] = useState<Section>('market-cycle');

  const sections: { id: Section; label: string }[] = [
    { id: 'market-cycle', label: 'Market Cycle' },
    { id: 'ratio-indicators', label: 'Ratio Indicators' },
    { id: 'risk-manager', label: 'Risk Manager' },
  ];

  return (
    <div className="space-y-6">
      {/* Fixed Section Navigation */}
      <div className="sticky top-[73px] z-30 bg-[var(--bg)]/90 backdrop-blur-sm pb-2 pt-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-2 bg-[var(--surface)]/80 border border-[var(--border)] rounded-2xl p-1.5 overflow-x-auto">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                activeSection === s.id
                  ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                  : 'text-gray-400 hover:text-[var(--text)] hover:bg-gray-800/50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section Content */}
      {activeSection === 'market-cycle' && <MarketCycleSection symbol={symbol} currentPrice={currentPrice} />}
      {activeSection === 'ratio-indicators' && <RatioIndicatorsSection symbol={symbol} />}
      {activeSection === 'risk-manager' && <RiskManagerSection symbol={symbol} currentPrice={currentPrice} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MARKET CYCLE SECTION
// ═══════════════════════════════════════════════════════════════════
function MarketCycleSection({ symbol, currentPrice }: { symbol: string; currentPrice?: number }) {
  return (
    <div className="space-y-6">
      <HeatmapCard symbol={symbol} currentPrice={currentPrice} />
      <NVTSignalCard symbol={symbol} currentPrice={currentPrice} />
    </div>
  );
}

// ─── 200 Week Moving Average Heatmap Card ─────────────────────────
function HeatmapCard({ symbol, currentPrice }: { symbol: string; currentPrice?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<HeatmapDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const pair = `${symbol}/USDT`;
      const res = await fetch(`/api/crypto/heatmap?symbol=${encodeURIComponent(pair)}`);
      if (!res.ok) throw new Error('Failed to fetch heatmap data');
      const result: HeatmapDataPoint[] = await res.json();
      if (Array.isArray(result) && result.length > 0) {
        setData(result);
        setError(null);
      }
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
    // Refresh weekly data every 5 minutes (the data itself is weekly, but we refresh for the latest week)
    intervalRef.current = setInterval(fetchData, 5 * 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // If we have live price data, update the last data point
  const displayData = data.length > 0 && currentPrice
    ? data.map((d, i) => (i === data.length - 1 ? { ...d, price: currentPrice } : d))
    : data;

  const livePrice = currentPrice || (data.length > 0 ? data[data.length - 1]?.price : undefined);

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            200 Week Moving Average Heatmap
          </h3>
          {lastUpdate && (
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live — weekly data
            </span>
          )}
        </div>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          Shows 200w MA vs {symbol} Price with dots showing % monthly increase of 200w MA
        </p>

        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="h-[300px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={displayData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis
                    dataKey="date"
                    type="category"
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={{ stroke: '#374151' }}
                    interval={Math.max(0, Math.floor(displayData.length / 6))}
                  />
                  <YAxis
                    dataKey="price"
                    type="number"
                    scale="log"
                    domain={['auto', 'auto']}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                    tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, name: any) => {
                      if (name === 'price' || name === 'Price') return [`$${(value ?? 0).toLocaleString()}`, 'Price'];
                      if (name === 'ma200w' || name === '200w MA') return [`$${(value ?? 0).toLocaleString()}`, '200w MA'];
                      return [`${(value ?? 0).toFixed(2)}%`, 'Monthly % Change'];
                    }}
                  />
                  {/* Current price horizontal reference line */}
                  {livePrice && (
                    <ReferenceLine
                      y={livePrice}
                      stroke="#eab308"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{ value: `$${livePrice.toLocaleString()}`, fill: '#eab308', fontSize: 10, position: 'right' }}
                    />
                  )}
                  {/* Price line */}
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#eab308"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                    name="Price"
                  />
                  {/* 200w MA line */}
                  <Line
                    type="monotone"
                    dataKey="ma200w"
                    stroke="#9ca3af"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="4 4"
                    isAnimationActive={false}
                    connectNulls
                    name="200w MA"
                  />
                  {/* Heatmap dots colored by monthly % change */}
                  <Scatter dataKey="price" shape="circle" isAnimationActive={false}>
                    {displayData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getHeatmapColor(entry.monthlyChange)}
                        r={4}
                      />
                    ))}
                  </Scatter>
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Color Legend */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-[var(--text-muted)]">Low % increase</span>
              <div className="flex h-3 rounded overflow-hidden">
                {['#6366f1', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb923c', '#f87171', '#ef4444', '#dc2626'].map(
                  (c) => (
                    <div key={c} className="w-6 h-full" style={{ backgroundColor: c }} />
                  )
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)]">High % increase</span>
            </div>
            <div className="flex items-center gap-4 mb-4 text-xs flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-yellow-500 inline-block rounded" /> Price
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0 border-t-2 border-dashed border-gray-400 inline-block" /> 200w MA
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0 border-t-2 border-dashed border-[var(--accent)] inline-block" /> Current Price
              </span>
            </div>

            {/* Live stats */}
            {data.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
                  <p className="text-[10px] text-[var(--text-muted)]">200w MA</p>
                  <p className="text-sm font-bold font-mono text-[var(--text)]">
                    ${data[data.length - 1].ma200w.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
                  <p className="text-[10px] text-[var(--text-muted)]">Monthly MA Change</p>
                  <p className={`text-sm font-bold font-mono ${data[data.length - 1].monthlyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data[data.length - 1].monthlyChange >= 0 ? '+' : ''}{data[data.length - 1].monthlyChange.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
                  <p className="text-[10px] text-[var(--text-muted)]">Data Points</p>
                  <p className="text-sm font-bold font-mono text-[var(--text)]">{data.length} weeks</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Description Cards */}
        <div className="space-y-3">
          <DescriptionCard
            title="How It Can Be Used"
            content="The long term Bitcoin investor can monitor the monthly colour changes. Historically, when we see orange and red dots assigned to the price chart, this has been a good time to sell Bitcoin as the market overheats. Periods where the price dots are purple and close to the 200 week MA have historically been good times to buy."
          />
          <DescriptionCard
            title="Bitcoin Price Prediction Using This Tool"
            content={`If you are looking to predict the price of Bitcoin or forecast where it may go in the future, the 200WMA heatmap can be a useful tool as it shows on a historical basis whether the current price is overextending (red dots) and may need to cool down. It can also show when Bitcoin price may be good value on a historical basis. This can be when the dots on the chart are purple or blue.`}
            collapsed={!expanded}
            onToggle={() => setExpanded(!expanded)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Advanced NVT Signal Card ──────────────────────────────────────
function NVTSignalCard({ symbol, currentPrice }: { symbol: string; currentPrice?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<NVTDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const pair = `${symbol}/USDT`;
      const res = await fetch(`/api/crypto/nvt?symbol=${encodeURIComponent(pair)}`);
      if (!res.ok) throw new Error('Failed to fetch NVT data');
      const result = await res.json();
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        setData(result.data);
        setError(null);
      }
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load NVT data');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30 * 60 * 1000); // refresh every 30 min
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // Update last point with live price
  const displayData = data.length > 0 && currentPrice
    ? data.map((d, i) => (i === data.length - 1 ? { ...d, price: currentPrice } : d))
    : data;

  const labelInterval = Math.max(1, Math.floor(displayData.length / 10));
  const latest = displayData[displayData.length - 1];

  const zoneColor = {
    overbought: 'text-red-400',
    oversold: 'text-green-400',
    neutral: 'text-yellow-400',
  };
  const zoneBg = {
    overbought: 'bg-red-500/10 border-red-500/30',
    oversold: 'bg-green-500/10 border-green-500/30',
    neutral: 'bg-yellow-500/10 border-yellow-500/30',
  };
  const zoneLabel = {
    overbought: 'Overbought — potential sell zone',
    oversold: 'Oversold — potential buy zone',
    neutral: 'Neutral — within normal range',
  };

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Advanced NVT Signal
          </h3>
          {lastUpdate && (
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live — daily on-chain data
            </span>
          )}
        </div>
        <p className="text-[var(--text-muted)] text-sm mb-1">
          NVT Signal = Network Value ÷ 90-Day MA of On-Chain Transaction Volume.
          Standard deviation bands flag overbought (red) and oversold (green) regimes.
        </p>
        <p className="text-gray-600 text-xs mb-4">
          Source: Blockchain.com on-chain TX volume • Price: Binance via CCXT
        </p>

        {/* Zone badge */}
        {!loading && !error && latest && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold mb-4 ${zoneBg[latest.zone]}`}>
            <span className={`w-2 h-2 rounded-full ${latest.zone === 'overbought' ? 'bg-red-400' : latest.zone === 'oversold' ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <span className={zoneColor[latest.zone]}>{zoneLabel[latest.zone]}</span>
          </div>
        )}

        {loading ? (
          <div className="h-[420px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-[var(--text-muted)] text-xs">Loading on-chain data…</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-[420px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <p className="text-gray-600 text-xs">On-chain data requires network access to Blockchain.com</p>
            </div>
          </div>
        ) : (
          <>
            {/* Dual chart: Price (top) + NVT Signal with bands (bottom) */}
            <div className="space-y-4 mb-4">
              {/* Price chart */}
              <div>
                <p className="text-[10px] text-[var(--text-muted)] mb-1 font-medium uppercase tracking-wide">Price (USD)</p>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <defs>
                        <linearGradient id="nvtPriceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#eab308" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#9ca3af', fontSize: 9 }}
                        axisLine={{ stroke: '#374151' }}
                        interval={labelInterval}
                        angle={-20}
                        textAnchor="end"
                        height={35}
                      />
                      <YAxis
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        axisLine={{ stroke: '#374151' }}
                        tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                        width={55}
                        domain={[(d: number) => d * 0.98, (d: number) => d * 1.02]}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                        formatter={(v: unknown) => [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Price']}
                        labelFormatter={(l) => `Date: ${l}`}
                      />
                      <Area type="monotone" dataKey="price" stroke="#eab308" strokeWidth={1.5} fill="url(#nvtPriceGrad)" dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* NVT Signal chart with bands */}
              <div>
                <p className="text-[10px] text-[var(--text-muted)] mb-1 font-medium uppercase tracking-wide">NVT Signal + Std Dev Bands</p>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={displayData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <defs>
                        <linearGradient id="nvtRedZone" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="nvtGreenZone" x1="0" y1="1" x2="0" y2="0">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#9ca3af', fontSize: 9 }}
                        axisLine={{ stroke: '#374151' }}
                        interval={labelInterval}
                        angle={-20}
                        textAnchor="end"
                        height={35}
                      />
                      <YAxis
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        axisLine={{ stroke: '#374151' }}
                        tickFormatter={(v) => v.toFixed(0)}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => {
                          const labels: Record<string, string> = {
                            nvt: 'NVT Signal',
                            nvtMean: 'Rolling Mean',
                            upper: 'Upper Band (+2σ)',
                            lower: 'Lower Band (−2σ)',
                          };
                          return [Number(value).toFixed(1), labels[name] ?? name];
                        }}
                        labelFormatter={(l) => `Date: ${l}`}
                      />
                      {/* Upper band fill */}
                      <Area type="monotone" dataKey="upper" stroke="none" fill="url(#nvtRedZone)" dot={false} isAnimationActive={false} />
                      {/* Lower band fill (inverted) */}
                      <Area type="monotone" dataKey="lower" stroke="none" fill="url(#nvtGreenZone)" dot={false} isAnimationActive={false} />
                      {/* Band borders */}
                      <Line type="monotone" dataKey="upper" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} name="upper" />
                      <Line type="monotone" dataKey="lower" stroke="#22c55e" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} name="lower" />
                      {/* Mean */}
                      <Line type="monotone" dataKey="nvtMean" stroke="#6b7280" strokeWidth={1} dot={false} strokeDasharray="2 2" isAnimationActive={false} name="nvtMean" />
                      {/* NVT Signal */}
                      <Line type="monotone" dataKey="nvt" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} name="nvt" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-blue-500 inline-block rounded" /> NVT Signal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-gray-500 inline-block rounded border-dashed border-t" /> Rolling Mean
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-red-400 inline-block rounded" /> Upper Band (+2σ)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-green-400 inline-block rounded" /> Lower Band (−2σ)
              </span>
            </div>

            {/* Live stats */}
            {latest && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
                  <p className="text-[10px] text-[var(--text-muted)]">NVT Signal</p>
                  <p className="text-sm font-bold font-mono text-blue-400">{latest.nvt.toFixed(1)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
                  <p className="text-[10px] text-[var(--text-muted)]">Upper Band</p>
                  <p className="text-sm font-bold font-mono text-red-400">{latest.upper.toFixed(1)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
                  <p className="text-[10px] text-[var(--text-muted)]">Lower Band</p>
                  <p className="text-sm font-bold font-mono text-green-400">{latest.lower.toFixed(1)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
                  <p className="text-[10px] text-[var(--text-muted)]">Signal</p>
                  <p className={`text-sm font-bold font-mono capitalize ${zoneColor[latest.zone]}`}>
                    {latest.zone}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Description */}
        <div className="space-y-3">
          <DescriptionCard
            title="How NVT Signal Works"
            content={`NVT Signal takes the total value of the Bitcoin network (Market Cap) and divides it by the 90-day moving average of daily on-chain transaction volume in USD.\n\nNVT Signal = Network Value ÷ 90DMA of Daily Transaction Value\n\nWhen Bitcoin's price is high relative to the value being transmitted on its network, NVT Signal rises — suggesting the price may be speculative and ahead of fundamental utility. When NVT falls, it suggests the network is processing more relative value, which is bullish.`}
          />
          <DescriptionCard
            title="How To Read The Standard Deviation Bands"
            content={`The Advanced NVT Signal adds rolling Bollinger-style bands (±2 standard deviations from the 90-day mean of the NVT Signal itself).\n\nRed zone (above upper band): Bitcoin is historically overbought relative to its network transaction activity. This has historically coincided with local cycle tops and intra-cycle take-profit points.\n\nGreen zone (below lower band): Bitcoin is historically oversold. Network activity is high relative to price, suggesting strong fundamental demand and potential accumulation zones.\n\nThe indicator works best on medium time frames (weeks to months) rather than for short-term trading.`}
            collapsed={!expanded}
            onToggle={() => setExpanded(!expanded)}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RATIO INDICATORS SECTION
// ═══════════════════════════════════════════════════════════════════
function RatioIndicatorsSection({ symbol }: { symbol: string }) {
  return (
    <div className="space-y-6">
      <STHMVRVCard symbol={symbol} />
      <MVRVZScoreCard symbol={symbol} />
    </div>
  );
}

// ─── Short Term Holder MVRV Card ──────────────────────────────────
function STHMVRVCard({ symbol }: { symbol: string }) {
  const [data, setData] = useState<{ date: string; value: number; price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const pair = `${symbol}/USDT`;
      const res = await fetch(`/api/crypto/mvrv?symbol=${encodeURIComponent(pair)}`);
      if (!res.ok) throw new Error('Failed to fetch MVRV data');
      const result = await res.json();
      if (result.sthMvrv && Array.isArray(result.sthMvrv)) {
        setData(result.sthMvrv);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-bold text-[var(--text)] mb-1 flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Short Term Holder MVRV
        </h3>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          Short-Term Holder MVRV (STH-MVRV) is MVRV that only analyses UTXOs younger than 155 days.
          As a result it is focussed only on shorter-term investors who are moving coins within a less
          than 155 days period.
        </p>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          <span className="text-gray-400 font-medium">What is MVRV?</span> The ratio between Market Value
          (price multiplied by bitcoins in circulation) and Realized Value (the price of UTXO&apos;s when they
          last moved onchain).
        </p>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          Short-Term Holder MVRV is useful as it can highlight when the market value of {symbol.toLowerCase() === 'btc' ? 'bitcoin' : symbol} is
          significantly higher or lower than the average cost basis for short-term market participants.
          Historically, these periods have coincided with $BTC being near its respective market highs and
          lows as shown on the chart above.
        </p>
        <p className="text-gray-600 text-xs mb-4 italic">
          Proxy-based estimate calculated from price / SMA(155) historical data.
        </p>

        {/* Chart */}
        {loading ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="h-[280px] flex items-center justify-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <defs>
                  <linearGradient id="sthMvrvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={{ stroke: '#374151' }}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={{ stroke: '#374151' }}
                  tickFormatter={(v) => v.toFixed(1)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [(value ?? 0).toFixed(3), 'STH-MVRV']}
                />
                <ReferenceLine y={1} stroke="#eab308" strokeDasharray="5 5" label={{ value: 'Break-even', fill: '#eab308', fontSize: 10 }} />
                <ReferenceLine y={1.4} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Overvalued', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={0.7} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Undervalued', fill: '#22c55e', fontSize: 10 }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#sthMvrvGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MVRV Z-Score Card ────────────────────────────────────────────
function MVRVZScoreCard({ symbol }: { symbol: string }) {
  const [data, setData] = useState<{ date: string; marketValue: number; realisedValue: number; zScore: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const pair = `${symbol}/USDT`;
      const res = await fetch(`/api/crypto/mvrv?symbol=${encodeURIComponent(pair)}`);
      if (!res.ok) throw new Error('Failed to fetch MVRV data');
      const result = await res.json();
      if (result.mvrvZScore && Array.isArray(result.mvrvZScore)) {
        setData(result.mvrvZScore);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-bold text-[var(--text)] mb-1 flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          MVRV Z-Score
        </h3>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          MVRV Z-Score is a {symbol.toLowerCase() === 'btc' ? 'bitcoin' : symbol} chart that uses blockchain analysis to identify
          periods where Bitcoin is extremely over or undervalued relative to its &apos;fair value&apos;.
        </p>

        {/* Metrics Description */}
        <div className="space-y-3 mb-6">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <p className="text-sm text-[var(--text)] font-medium mb-1">1. Market Value (black line)</p>
            <p className="text-xs text-gray-400">
              The current price of Bitcoin multiplied by the number of coins in circulation.
              This is like market cap in traditional markets i.e. share price multiplied by number of shares.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <p className="text-sm text-[var(--text)] font-medium mb-1">2. Realised Value (blue line)</p>
            <p className="text-xs text-gray-400">
              Rather than taking the current price of Bitcoin, Realised Value takes the price of each Bitcoin
              when it was last moved i.e. the last time it was sent from one wallet to another wallet. It then
              adds up all those individual prices and takes an average of them. It then multiplies that average
              price by the total number of coins in circulation. In doing so, it strips out the short term
              market sentiment. It can therefore be seen as a more &apos;true&apos; long term measure of Bitcoin value.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <p className="text-sm text-[var(--text)] font-medium mb-1">3. Z-Score (orange line)</p>
            <p className="text-xs text-gray-400">
              A standard deviation test that pulls out the extremes in the data between market value and realised value.
            </p>
          </div>
        </div>
        <p className="text-gray-600 text-xs mb-4 italic">
          Proxy-based: Market Value = Price, Realised Value = SMA(365), Z-Score from rolling standard deviation.
        </p>

        {/* Chart */}
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : (
          <>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <YAxis
                    yAxisId="price"
                    orientation="left"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                    tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                  />
                  <YAxis
                    yAxisId="zscore"
                    orientation="right"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine yAxisId="zscore" y={7} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Overvalued', fill: '#ef4444', fontSize: 10 }} />
                  <ReferenceLine yAxisId="zscore" y={0} stroke="#6b7280" strokeDasharray="3 3" />
                  <ReferenceLine yAxisId="zscore" y={-0.5} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Undervalued', fill: '#22c55e', fontSize: 10 }} />
                  <Line yAxisId="price" type="monotone" dataKey="marketValue" stroke="#ffffff" strokeWidth={1.5} dot={false} name="Market Value" />
                  <Line yAxisId="price" type="monotone" dataKey="realisedValue" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Realised Value" />
                  <Line yAxisId="zscore" type="monotone" dataKey="zScore" stroke="#f97316" strokeWidth={2} dot={false} name="Z-Score" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-3 text-xs flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-white inline-block rounded" /> Market Value
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-blue-500 inline-block rounded" /> Realised Value
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-orange-500 inline-block rounded" /> Z-Score
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RISK MANAGER SECTION
// ═══════════════════════════════════════════════════════════════════
function RiskManagerSection({ symbol, currentPrice }: { symbol: string; currentPrice?: number }) {
  return (
    <div className="space-y-6">
      <PositionCard symbol={symbol} />
      <CVaRMonteCarloCard symbol={symbol} />
      <StopLossCard symbol={symbol} currentPrice={currentPrice} />
    </div>
  );
}

// ─── Position Sizing Card ─────────────────────────────────────────
function PositionCard({ symbol }: { symbol: string }) {
  // Position Size Calculator
  const [accountRisk, setAccountRisk] = useState('100');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');

  // Kelly Criterion
  const [winRate, setWinRate] = useState('55');
  const [winLossRatio, setWinLossRatio] = useState('2');

  // Sharpe / Sortino time window
  const [timeWindow, setTimeWindow] = useState('30');
  const [avgReturn, setAvgReturn] = useState('0.5');
  const [riskFreeRate, setRiskFreeRate] = useState('0.02');
  const [totalVol, setTotalVol] = useState('15');
  const [downVol, setDownVol] = useState('10');

  const positionSize =
    entryPrice && stopLossPrice && parseFloat(entryPrice) !== parseFloat(stopLossPrice)
      ? parseFloat(accountRisk) / Math.abs(parseFloat(entryPrice) - parseFloat(stopLossPrice))
      : null;

  const p = parseFloat(winRate) / 100;
  const b = parseFloat(winLossRatio);
  const q = 1 - p;
  const kelly = b > 0 ? ((b * p - q) / b) * 100 : 0;

  const sharpe =
    parseFloat(totalVol) > 0
      ? (parseFloat(avgReturn) - parseFloat(riskFreeRate)) / parseFloat(totalVol)
      : 0;

  const sortino =
    parseFloat(downVol) > 0
      ? (parseFloat(avgReturn) - parseFloat(riskFreeRate)) / parseFloat(downVol)
      : 0;

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-bold text-[var(--text)] mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Position Sizing
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Position Size Calculator */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h4 className="text-sm font-semibold text-[var(--text)] mb-3">Position Size Calculator</h4>
            <p className="text-xs text-[var(--text-muted)] mb-3">Position Size = Account Risk / (Entry Price - Stop-Loss Price)</p>
            <div className="space-y-3">
              <InputField label="Account Risk ($)" value={accountRisk} onChange={setAccountRisk} placeholder="100" />
              <InputField label={`Entry Price ($)`} value={entryPrice} onChange={setEntryPrice} placeholder="50000" />
              <InputField label={`Stop-Loss Price ($)`} value={stopLossPrice} onChange={setStopLossPrice} placeholder="48000" />
              <div className="bg-[var(--surface)]/80 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-[var(--text-muted)]">Position Size</p>
                <p className="text-xl font-bold font-mono text-[var(--accent)]">
                  {positionSize !== null ? `${positionSize.toFixed(6)} ${symbol}` : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Kelly Criterion */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h4 className="text-sm font-semibold text-[var(--text)] mb-3">Kelly Criterion</h4>
            <p className="text-xs text-[var(--text-muted)] mb-3">f* = (bp - q) / b</p>
            <div className="space-y-3">
              <InputField label="Win Rate (%)" value={winRate} onChange={setWinRate} placeholder="55" />
              <InputField label="Win/Loss Ratio (b)" value={winLossRatio} onChange={setWinLossRatio} placeholder="2" />
              <div className="bg-[var(--surface)]/80 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-[var(--text-muted)]">Optimal Bet Size (f*)</p>
                <p className={`text-xl font-bold font-mono ${kelly > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {kelly.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {kelly > 0 ? 'Positive edge — bet within Kelly fraction' : 'Negative edge — do not bet'}
                </p>
              </div>
            </div>
          </div>

          {/* Sharpe & Sortino Ratios */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 lg:col-span-2">
            <h4 className="text-sm font-semibold text-[var(--text)] mb-3">Sharpe & Sortino Ratios</h4>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              <span className="text-gray-400">Sharpe:</span> Excess return per unit of total volatility.{' '}
              <span className="text-gray-400">Sortino (Preferred for Crypto):</span> Only penalizes downside
              volatility. Since crypto &quot;moons&quot; are technically a form of volatility, the Sharpe ratio might
              make a great trade look &quot;risky.&quot; The Sortino ratio ignores upside volatility and only looks at the
              risk of losing money.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <InputField label="Time Window (days)" value={timeWindow} onChange={setTimeWindow} placeholder="30" />
              <InputField label="Avg Return (%)" value={avgReturn} onChange={setAvgReturn} placeholder="0.5" />
              <InputField label="Risk-Free Rate (%)" value={riskFreeRate} onChange={setRiskFreeRate} placeholder="0.02" />
              <InputField label="Total Volatility (%)" value={totalVol} onChange={setTotalVol} placeholder="15" />
              <InputField label="Downside Volatility (%)" value={downVol} onChange={setDownVol} placeholder="10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--surface)]/80 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-[var(--text-muted)]">Sharpe Ratio</p>
                <p className={`text-xl font-bold font-mono ${sharpe > 1 ? 'text-green-400' : sharpe > 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
                  {sharpe.toFixed(4)}
                </p>
              </div>
              <div className="bg-[var(--surface)]/80 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-[var(--text-muted)]">Sortino Ratio</p>
                <p className={`text-xl font-bold font-mono ${sortino > 1 ? 'text-green-400' : sortino > 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
                  {sortino.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CVaR Monte Carlo Card ────────────────────────────────────────
function CVaRMonteCarloCard({ symbol }: { symbol: string }) {
  const [numSims, setNumSims] = useState('1000');
  const [numDays, setNumDays] = useState('252');
  const [initInvestment, setInitInvestment] = useState('10000');
  const [expectedReturn, setExpectedReturn] = useState('0.05');
  const [volatility, setVolatility] = useState('60');
  const [confidenceLevel, setConfidenceLevel] = useState('95');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MonteCarloResult | null>(null);

  const runSimulation = useCallback(() => {
    setRunning(true);

    // Run the Monte Carlo simulation in next tick to allow UI update
    setTimeout(() => {
      const sims = parseInt(numSims) || 1000;
      const days = parseInt(numDays) || 252;
      const init = parseFloat(initInvestment) || 10000;
      const mu = (parseFloat(expectedReturn) || 0.05) / 252; // daily
      const sigma = (parseFloat(volatility) || 60) / 100 / Math.sqrt(252); // daily vol
      const conf = (parseFloat(confidenceLevel) || 95) / 100;

      const finalValues: number[] = [];
      const maxDrawdowns: number[] = [];
      const paths: number[][] = [];
      const pathsToStore = Math.min(sims, 50); // store up to 50 for display

      for (let s = 0; s < sims; s++) {
        let value = init;
        let peak = init;
        let maxDD = 0;
        const path: number[] = s < pathsToStore ? [init] : [];

        for (let d = 0; d < days; d++) {
          // Box-Muller transform for normal distribution
          const u1 = Math.random();
          const u2 = Math.random();
          const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          const dailyReturn = mu + sigma * z;
          value *= 1 + dailyReturn;
          if (value > peak) peak = value;
          const dd = (peak - value) / peak;
          if (dd > maxDD) maxDD = dd;
          if (s < pathsToStore) path.push(value);
        }

        finalValues.push(value);
        maxDrawdowns.push(maxDD);
        if (s < pathsToStore) paths.push(path);
      }

      // Sort for percentile calculations
      const sortedReturns = finalValues.map((v) => (v - init) / init).sort((a, b) => a - b);
      const sortedDD = maxDrawdowns.sort((a, b) => b - a);

      const cvarIdx = Math.floor(sortedReturns.length * (1 - conf));
      const cvarSlice = sortedReturns.slice(0, cvarIdx);
      const cvar = cvarSlice.length > 0 ? (cvarSlice.reduce((a, b) => a + b, 0) / cvarSlice.length) * 100 : 0;

      const cvar99Idx = Math.floor(sortedReturns.length * 0.01);
      const cvar99Slice = sortedReturns.slice(0, cvar99Idx);
      const cvar99 = cvar99Slice.length > 0 ? (cvar99Slice.reduce((a, b) => a + b, 0) / cvar99Slice.length) * 100 : 0;

      const meanRet = (sortedReturns.reduce((a, b) => a + b, 0) / sortedReturns.length) * 100;
      const medianRet = sortedReturns[Math.floor(sortedReturns.length / 2)] * 100;
      const p5 = sortedReturns[Math.floor(sortedReturns.length * 0.05)] * 100;
      const p95 = sortedReturns[Math.floor(sortedReturns.length * 0.95)] * 100;

      setResult({
        paths,
        cvar95: cvar,
        cvar99: cvar99,
        maxDrawdown: sortedDD[0] * 100,
        meanReturn: meanRet,
        medianReturn: medianRet,
        percentile5: p5,
        percentile95: p95,
      });
      setRunning(false);
    }, 50);
  }, [numSims, numDays, initInvestment, expectedReturn, volatility, confidenceLevel]);

  // Prepare chart data from paths
  const chartData = result
    ? Array.from({ length: (parseInt(numDays) || 252) + 1 }, (_, i) => {
        const point: Record<string, number> = { day: i };
        result.paths.forEach((path, idx) => {
          if (path[i] !== undefined) point[`p${idx}`] = path[i];
        });
        return point;
      })
    : [];

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-bold text-[var(--text)] mb-1 flex items-center gap-2">
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          CVaR Simulation (Monte Carlo)
        </h3>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          Set your scenario parameters and run a Monte Carlo simulation to estimate Conditional Value at Risk (CVaR)
          and Max Drawdown for {symbol}.
        </p>

        {/* Parameter Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <InputField label="Number of Simulations" value={numSims} onChange={setNumSims} placeholder="1000" />
          <InputField label="Time Horizon (days)" value={numDays} onChange={setNumDays} placeholder="252" />
          <InputField label="Initial Investment ($)" value={initInvestment} onChange={setInitInvestment} placeholder="10000" />
          <InputField label="Expected Annual Return (%)" value={expectedReturn} onChange={setExpectedReturn} placeholder="5" />
          <InputField label="Annual Volatility (%)" value={volatility} onChange={setVolatility} placeholder="60" />
          <InputField label="Confidence Level (%)" value={confidenceLevel} onChange={setConfidenceLevel} placeholder="95" />
        </div>

        {/* Run Button */}
        <button
          onClick={runSimulation}
          disabled={running}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {running ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Running Simulation...
            </>
          ) : (
            'Start Simulation'
          )}
        </button>

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <p className="text-xs text-[var(--text-muted)]">CVaR (95%)</p>
                <p className="text-lg font-bold font-mono text-red-400">{result.cvar95.toFixed(2)}%</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <p className="text-xs text-[var(--text-muted)]">CVaR (99%)</p>
                <p className="text-lg font-bold font-mono text-red-500">{result.cvar99.toFixed(2)}%</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <p className="text-xs text-[var(--text-muted)]">Max Drawdown</p>
                <p className="text-lg font-bold font-mono text-orange-400">{result.maxDrawdown.toFixed(2)}%</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <p className="text-xs text-[var(--text-muted)]">Mean Return</p>
                <p className={`text-lg font-bold font-mono ${result.meanReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.meanReturn >= 0 ? '+' : ''}{result.meanReturn.toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <p className="text-xs text-[var(--text-muted)]">Median Return</p>
                <p className={`text-sm font-bold font-mono ${result.medianReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.medianReturn >= 0 ? '+' : ''}{result.medianReturn.toFixed(2)}%
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <p className="text-xs text-[var(--text-muted)]">5th Percentile</p>
                <p className="text-sm font-bold font-mono text-red-400">{result.percentile5.toFixed(2)}%</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <p className="text-xs text-[var(--text-muted)]">95th Percentile</p>
                <p className="text-sm font-bold font-mono text-green-400">+{result.percentile95.toFixed(2)}%</p>
              </div>
            </div>

            {/* Monte Carlo Paths Chart */}
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
              <p className="text-xs text-[var(--text-muted)] mb-2">Simulation Paths (showing up to 50)</p>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      axisLine={{ stroke: '#374151' }}
                      label={{ value: 'Days', position: 'bottom', fill: '#6b7280', fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      axisLine={{ stroke: '#374151' }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid #374151',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                      labelFormatter={(v) => `Day ${v}`}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) => [`$${(value ?? 0).toFixed(2)}`, '']}
                    />
                    {result.paths.map((_, idx) => (
                      <Line
                        key={idx}
                        type="monotone"
                        dataKey={`p${idx}`}
                        stroke={`hsl(${(idx * 7) % 360}, 70%, 60%)`}
                        strokeWidth={0.5}
                        strokeOpacity={0.4}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stop Loss Card ───────────────────────────────────────────────
function StopLossCard({ symbol, currentPrice }: { symbol: string; currentPrice?: number }) {
  const { addStopLoss } = useStopLoss();
  const [activeView, setActiveView] = useState<StopLossSimView | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  // ATR parameters
  const [atrPeriod, setAtrPeriod] = useState('14');
  const [atrMultiplier, setAtrMultiplier] = useState('2');

  // Technical stop parameters
  const [supportLevel, setSupportLevel] = useState('');
  const [resistanceLevel, setResistanceLevel] = useState('');

  // Trailing stop parameters
  const [trailPercent, setTrailPercent] = useState('5');

  // Risk-Reward ratio
  const [riskRewardRatio, setRiskRewardRatio] = useState('3');
  const [entryPriceSL, setEntryPriceSL] = useState('');
  const [riskAmount, setRiskAmount] = useState('');

  // Backtest state
  const [backtesting, setBacktesting] = useState(false);
  const [backtestResult, setBacktestResult] = useState<{
    totalTrades: number;
    wins: number;
    losses: number;
    finalReturn: number;
    maxDrawdown: number;
    sharpe: number;
    data: { day: number; value: number }[];
  } | null>(null);

  const techniques: { type: StopLossSimView['type']; label: string; description: string }[] = [
    {
      type: 'atr',
      label: 'ATR (Average True Range)',
      description:
        'Use the ATR indicator to set stops based on current volatility. If BTC is moving $2,000 a day, a $500 stop-loss is too tight and will likely be triggered by "market noise."',
    },
    {
      type: 'technical',
      label: 'Technical Stops',
      description:
        'Place your stop-loss just below a major Support Level or above a Resistance Level. If those levels break, your "thesis" for the trade is officially dead.',
    },
    {
      type: 'trailing',
      label: 'Trailing Stops',
      description:
        'As your trade moves into profit, move your stop-loss up to "lock in" gains while still giving the price room to breathe.',
    },
    {
      type: 'ratio',
      label: 'Target 1:2 or 1:3',
      description:
        'For every $1 you risk, you should aim to make at least $2 or $3. The Math: With a 1:3 ratio, you can be wrong 70% of the time and still be a profitable trader because your few wins are much larger than your many small losses.',
    },
  ];

  const runBacktest = useCallback(() => {
    setBacktesting(true);

    setTimeout(() => {
      // Simulate a 5-year backtest (1260 trading days)
      const days = 1260;
      let capital = 10000;
      let peak = capital;
      let maxDD = 0;
      let wins = 0;
      let losses = 0;
      let totalTrades = 0;
      const dataPoints: { day: number; value: number }[] = [{ day: 0, value: capital }];
      const dailyReturns: number[] = [];

      let inPosition = false;
      let posEntry = 0;
      let stopLevel = 0;
      let targetLevel = 0;
      let price = 50000; // simulated starting price

      for (let d = 1; d <= days; d++) {
        // Random walk with slight upward drift
        const dailyMove = (Math.random() - 0.48) * 0.03;
        price *= 1 + dailyMove;

        if (!inPosition) {
          // Enter a new position randomly (~every 20 days)
          if (Math.random() < 0.05) {
            inPosition = true;
            posEntry = price;
            totalTrades++;

            if (activeView?.type === 'atr') {
              const atrVal = price * 0.02 * parseFloat(atrMultiplier || '2');
              stopLevel = posEntry - atrVal;
              targetLevel = posEntry + atrVal * parseFloat(riskRewardRatio || '3');
            } else if (activeView?.type === 'technical') {
              stopLevel = posEntry * 0.95;
              targetLevel = posEntry * 1.15;
            } else if (activeView?.type === 'trailing') {
              const trail = parseFloat(trailPercent || '5') / 100;
              stopLevel = posEntry * (1 - trail);
              targetLevel = posEntry * 1.3;
            } else {
              const rr = parseFloat(riskRewardRatio || '3');
              const risk = posEntry * 0.03;
              stopLevel = posEntry - risk;
              targetLevel = posEntry + risk * rr;
            }
          }
        } else {
          // Update trailing stop if applicable
          if (activeView?.type === 'trailing' && price > posEntry) {
            const trail = parseFloat(trailPercent || '5') / 100;
            const newStop = price * (1 - trail);
            if (newStop > stopLevel) stopLevel = newStop;
          }

          // Check stop or target hit
          if (price <= stopLevel) {
            const pnl = (stopLevel - posEntry) / posEntry;
            capital *= 1 + pnl * 0.1; // 10% position size
            dailyReturns.push(pnl * 0.1);
            losses++;
            inPosition = false;
          } else if (price >= targetLevel) {
            const pnl = (targetLevel - posEntry) / posEntry;
            capital *= 1 + pnl * 0.1;
            dailyReturns.push(pnl * 0.1);
            wins++;
            inPosition = false;
          }
        }

        if (capital > peak) peak = capital;
        const dd = (peak - capital) / peak;
        if (dd > maxDD) maxDD = dd;

        if (d % 5 === 0 || d === days) {
          dataPoints.push({ day: d, value: capital });
        }
      }

      const avgRet = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
      const stdDev = dailyReturns.length > 1
        ? Math.sqrt(dailyReturns.reduce((sum, r) => sum + (r - avgRet) ** 2, 0) / (dailyReturns.length - 1))
        : 1;

      setBacktestResult({
        totalTrades,
        wins,
        losses,
        finalReturn: ((capital - 10000) / 10000) * 100,
        maxDrawdown: maxDD * 100,
        sharpe: stdDev > 0 ? (avgRet / stdDev) * Math.sqrt(252) : 0,
        data: dataPoints,
      });
      setBacktesting(false);
    }, 100);
  }, [activeView, atrMultiplier, riskRewardRatio, trailPercent]);

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-bold text-[var(--text)] mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {symbol} Stop Loss Techniques
        </h3>

        {/* Technique Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {techniques.map((t) => (
            <button
              key={t.type}
              onClick={() => {
                setActiveView(activeView?.type === t.type ? null : { type: t.type, label: t.label });
                setBacktestResult(null);
              }}
              className={`text-left p-4 rounded-xl border transition-all ${
                activeView?.type === t.type
                  ? 'bg-yellow-500/10 border-[var(--accent)]/40 ring-1 ring-yellow-500/20'
                  : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
              }`}
            >
              <p className={`text-sm font-semibold mb-1 ${activeView?.type === t.type ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
                {t.label}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{t.description}</p>
            </button>
          ))}
        </div>

        {/* Simulation View */}
        {activeView && (
          <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30 space-y-4">
            <h4 className="text-sm font-semibold text-[var(--text)]">
              {activeView.label} — Simulation Parameters
            </h4>

            {activeView.type === 'atr' && (
              <div className="grid grid-cols-2 gap-3">
                <InputField label="ATR Period" value={atrPeriod} onChange={setAtrPeriod} placeholder="14" />
                <InputField label="ATR Multiplier" value={atrMultiplier} onChange={setAtrMultiplier} placeholder="2" />
              </div>
            )}

            {activeView.type === 'technical' && (
              <div className="grid grid-cols-2 gap-3">
                <InputField label={`Support Level ($)`} value={supportLevel} onChange={setSupportLevel} placeholder="45000" />
                <InputField label={`Resistance Level ($)`} value={resistanceLevel} onChange={setResistanceLevel} placeholder="55000" />
              </div>
            )}

            {activeView.type === 'trailing' && (
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Trail Percentage (%)" value={trailPercent} onChange={setTrailPercent} placeholder="5" />
                <InputField label="Risk/Reward Ratio" value={riskRewardRatio} onChange={setRiskRewardRatio} placeholder="3" />
              </div>
            )}

            {activeView.type === 'ratio' && (
              <div className="grid grid-cols-3 gap-3">
                <InputField label={`Entry Price ($)`} value={entryPriceSL} onChange={setEntryPriceSL} placeholder="50000" />
                <InputField label="Risk Amount ($)" value={riskAmount} onChange={setRiskAmount} placeholder="1000" />
                <InputField label="Risk/Reward Ratio" value={riskRewardRatio} onChange={setRiskRewardRatio} placeholder="3" />
              </div>
            )}

            {activeView.type === 'ratio' && entryPriceSL && riskAmount && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--surface)]/80 rounded-lg p-3 border border-gray-700">
                  <p className="text-xs text-[var(--text-muted)]">Stop Loss Level</p>
                  <p className="text-lg font-bold font-mono text-red-400">
                    ${(parseFloat(entryPriceSL) - parseFloat(riskAmount)).toLocaleString()}
                  </p>
                </div>
                <div className="bg-[var(--surface)]/80 rounded-lg p-3 border border-gray-700">
                  <p className="text-xs text-[var(--text-muted)]">Take Profit Level</p>
                  <p className="text-lg font-bold font-mono text-green-400">
                    ${(parseFloat(entryPriceSL) + parseFloat(riskAmount) * parseFloat(riskRewardRatio || '3')).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Add Stop Loss to Tracking */}
            <button
              onClick={() => {
                const price = currentPrice || 50000;
                let stopLevel = 0;
                let targetLevel = 0;

                if (activeView?.type === 'atr') {
                  const atrVal = price * 0.02 * parseFloat(atrMultiplier || '2');
                  stopLevel = price - atrVal;
                  targetLevel = price + atrVal * parseFloat(riskRewardRatio || '3');
                } else if (activeView?.type === 'technical') {
                  stopLevel = parseFloat(supportLevel) || price * 0.95;
                  targetLevel = parseFloat(resistanceLevel) || price * 1.15;
                } else if (activeView?.type === 'trailing') {
                  const trail = parseFloat(trailPercent) / 100;
                  stopLevel = price * (1 - trail);
                  targetLevel = price * (1 + trail * parseFloat(riskRewardRatio || '3'));
                } else if (activeView?.type === 'ratio') {
                  const risk = parseFloat(riskAmount) || price * 0.03;
                  const entry = parseFloat(entryPriceSL) || price;
                  stopLevel = entry - risk;
                  targetLevel = entry + risk * parseFloat(riskRewardRatio || '3');
                }

                addStopLoss({
                  symbol,
                  type: activeView!.type,
                  label: activeView!.label,
                  entryPrice: activeView?.type === 'ratio' && entryPriceSL ? parseFloat(entryPriceSL) : price,
                  stopLevel,
                  targetLevel,
                  atrPeriod: parseFloat(atrPeriod),
                  atrMultiplier: parseFloat(atrMultiplier),
                  trailPercent: parseFloat(trailPercent),
                  riskRewardRatio: parseFloat(riskRewardRatio),
                  supportLevel: parseFloat(supportLevel) || undefined,
                  resistanceLevel: parseFloat(resistanceLevel) || undefined,
                  riskAmount: parseFloat(riskAmount) || undefined,
                });

                setAddedMessage('Stop Loss added! Check the Market tab.');
                setTimeout(() => setAddedMessage(null), 3000);
              }}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-green-600 text-[var(--text)] hover:bg-green-500 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Stop Loss to Tracking
            </button>

            {addedMessage && (
              <p className="text-center text-green-400 text-sm animate-pulse">{addedMessage}</p>
            )}

            {/* Backtest — available for ATR, Trailing, Target only (NOT Technical) */}
            {activeView?.type !== 'technical' && (
              <button
                onClick={runBacktest}
                disabled={backtesting}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {backtesting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Running 5Y Backtest...
                  </>
                ) : (
                  'Backtest (5 Year)'
                )}
              </button>
            )}

            {/* Backtest Results */}
            {backtestResult && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <MiniStat label="Total Trades" value={backtestResult.totalTrades.toString()} />
                  <MiniStat label="Wins" value={backtestResult.wins.toString()} color="text-green-400" />
                  <MiniStat label="Losses" value={backtestResult.losses.toString()} color="text-red-400" />
                  <MiniStat
                    label="Win Rate"
                    value={`${backtestResult.totalTrades > 0 ? ((backtestResult.wins / backtestResult.totalTrades) * 100).toFixed(1) : 0}%`}
                  />
                  <MiniStat
                    label="Return"
                    value={`${backtestResult.finalReturn >= 0 ? '+' : ''}${backtestResult.finalReturn.toFixed(2)}%`}
                    color={backtestResult.finalReturn >= 0 ? 'text-green-400' : 'text-red-400'}
                  />
                  <MiniStat label="Max DD" value={`${backtestResult.maxDrawdown.toFixed(2)}%`} color="text-orange-400" />
                </div>

                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={backtestResult.data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <defs>
                        <linearGradient id="btGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        axisLine={{ stroke: '#374151' }}
                        label={{ value: 'Trading Days', position: 'bottom', fill: '#6b7280', fontSize: 10 }}
                      />
                      <YAxis
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        axisLine={{ stroke: '#374151' }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111827',
                          border: '1px solid #374151',
                          borderRadius: '0.75rem',
                          color: '#fff',
                          fontSize: '11px',
                        }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any) => [`$${(value ?? 0).toFixed(2)}`, 'Portfolio Value']}
                      />
                      <Area type="monotone" dataKey="value" stroke="#eab308" strokeWidth={2} fill="url(#btGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SHARED / UTILITY COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-[var(--text-muted)] mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[var(--surface)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-yellow-500/20 placeholder:text-gray-600"
      />
    </div>
  );
}

function DescriptionCard({
  title,
  content,
  collapsed,
  onToggle,
}: {
  title: string;
  content: string;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const isCollapsible = collapsed !== undefined;

  return (
    <div className="bg-gray-800/40 rounded-xl border border-gray-700/40 overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full text-left p-4 ${isCollapsible ? 'cursor-pointer hover:bg-gray-800/60' : 'cursor-default'}`}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--accent)]">{title}</p>
          {isCollapsible && (
            <svg
              className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${!collapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>
      {(!isCollapsible || !collapsed) && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">{content}</p>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color = 'text-[var(--text)]' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[var(--surface)]/80 rounded-lg p-2 border border-gray-700/50">
      <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
      <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DATA GENERATORS (illustrative / placeholder data)
// ═══════════════════════════════════════════════════════════════════

function getHeatmapColor(pctChange: number): string {
  if (pctChange >= 8) return '#dc2626';
  if (pctChange >= 6) return '#ef4444';
  if (pctChange >= 4) return '#f87171';
  if (pctChange >= 3) return '#fb923c';
  if (pctChange >= 2) return '#f472b6';
  if (pctChange >= 1) return '#e879f9';
  if (pctChange >= 0.5) return '#c084fc';
  if (pctChange >= 0) return '#a78bfa';
  if (pctChange >= -0.5) return '#818cf8';
  return '#6366f1';
}

// generateHeatmapData, generateStockToFlowData, generateSTHMVRVData, generateMVRVZScoreData
// removed — now using real API data
