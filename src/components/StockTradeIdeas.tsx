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

// ─── Types ────────────────────────────────────────────────────────
interface StockTradeIdeasProps {
  symbol: string;
  currentPrice?: number;
}

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

// ─── Component ────────────────────────────────────────────────────
export default function StockTradeIdeas({ symbol, currentPrice }: StockTradeIdeasProps) {
  return (
    <div className="space-y-6">
      <StockHeatmapCard symbol={symbol} currentPrice={currentPrice} />
      <StockNVTSignalCard symbol={symbol} currentPrice={currentPrice} />
    </div>
  );
}

// ─── Heatmap Color Helper ─────────────────────────────────────────
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

// ─── 200 Week Moving Average Heatmap Card ─────────────────────────
function StockHeatmapCard({ symbol, currentPrice }: { symbol: string; currentPrice?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<HeatmapDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/stocks/heatmap?symbol=${encodeURIComponent(symbol)}`);
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
    intervalRef.current = setInterval(fetchData, 30 * 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const displayData =
    data.length > 0 && currentPrice
      ? data.map((d, i) => (i === data.length - 1 ? { ...d, price: currentPrice } : d))
      : data;

  const livePrice = currentPrice || (data.length > 0 ? data[data.length - 1]?.price : undefined);

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            200 Week Moving Average Heatmap
          </h3>
          {lastUpdate && (
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Weekly data
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
                    domain={['auto', 'auto']}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                    tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0)}`}
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
                      if (name === 'price' || name === 'Price')
                        return [`R$${(value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Preco'];
                      if (name === 'ma200w' || name === '200w MA')
                        return [`R$${(value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '200w MA'];
                      return [`${Number(value ?? 0).toFixed(2)}%`, 'Variacao Mensal MA'];
                    }}
                  />
                  {livePrice && (
                    <ReferenceLine
                      y={livePrice}
                      stroke="#eab308"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `R$${livePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        fill: '#eab308',
                        fontSize: 10,
                        position: 'right',
                      }}
                    />
                  )}
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
                  <Scatter dataKey="price" shape="circle" isAnimationActive={false}>
                    {displayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getHeatmapColor(entry.monthlyChange)} r={4} />
                    ))}
                  </Scatter>
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Color Legend */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-[var(--text-muted)]">Low % increase</span>
              <div className="flex h-3 rounded overflow-hidden">
                {[
                  '#6366f1',
                  '#818cf8',
                  '#a78bfa',
                  '#c084fc',
                  '#e879f9',
                  '#f472b6',
                  '#fb923c',
                  '#f87171',
                  '#ef4444',
                  '#dc2626',
                ].map((c) => (
                  <div key={c} className="w-6 h-full" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="text-xs text-[var(--text-muted)]">High % increase</span>
            </div>
            <div className="flex items-center gap-4 mb-4 text-xs flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-yellow-500 inline-block rounded" /> Preco
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0 border-t-2 border-dashed border-gray-400 inline-block" /> 200w MA
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0 border-t-2 border-dashed border-[var(--accent)] inline-block" /> Preco Atual
              </span>
            </div>

            {/* Live stats */}
            {data.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
                  <p className="text-[10px] text-[var(--text-muted)]">200w MA</p>
                  <p className="text-sm font-bold font-mono text-[var(--text)]">
                    R${data[data.length - 1].ma200w.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
                  <p className="text-[10px] text-[var(--text-muted)]">Variacao Mensal MA</p>
                  <p
                    className={`text-sm font-bold font-mono ${
                      data[data.length - 1].monthlyChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {data[data.length - 1].monthlyChange >= 0 ? '+' : ''}
                    {data[data.length - 1].monthlyChange.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
                  <p className="text-[10px] text-[var(--text-muted)]">Data Points</p>
                  <p className="text-sm font-bold font-mono text-[var(--text)]">{data.length} semanas</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Description Cards */}
        <div className="space-y-3">
          <DescriptionCard
            title="Como usar"
            content={`O investidor de longo prazo pode monitorar as mudancas de cor mensais. Historicamente, quando vemos pontos laranjas e vermelhos atribuidos ao grafico de preco, pode ser um bom momento para realizar lucros, pois o mercado esta sobreaquecido. Periodos em que os pontos sao roxos e proximos da media movel de 200 semanas historicamente foram bons momentos de compra.`}
          />
          <DescriptionCard
            title="Previsao de preco usando esta ferramenta"
            content={`O heatmap de 200 semanas pode ser uma ferramenta util pois mostra, com base historica, se o preco atual esta se estendendo demais (pontos vermelhos) e pode precisar esfriar. Tambem pode mostrar quando o preco pode estar com bom valor numa base historica — quando os pontos no grafico sao roxos ou azuis.`}
            collapsed={!expanded}
            onToggle={() => setExpanded(!expanded)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Stock NVT Signal Card ──────────────────────────────────────
function StockNVTSignalCard({ symbol, currentPrice }: { symbol: string; currentPrice?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<NVTDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/stocks/nvt?symbol=${encodeURIComponent(symbol)}`);
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
    intervalRef.current = setInterval(fetchData, 30 * 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const displayData =
    data.length > 0 && currentPrice
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
    overbought: 'Sobrecomprado — zona potencial de venda',
    oversold: 'Sobrevendido — zona potencial de compra',
    neutral: 'Neutro — dentro da faixa normal',
  };

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            NVT Signal Adaptado
          </h3>
          {lastUpdate && (
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Dados diarios
            </span>
          )}
        </div>
        <p className="text-[var(--text-muted)] text-sm mb-1">
          NVT Signal = Market Cap / Media Movel 90 dias do Volume Financeiro Diario.
          Bandas de desvio padrao identificam zonas de sobrecompra (vermelho) e sobrevenda (verde).
        </p>
        <p className="text-gray-600 text-xs mb-4">Fonte: BRAPI — Volume financeiro diario da B3</p>

        {/* Zone badge */}
        {!loading && !error && latest && (
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold mb-4 ${zoneBg[latest.zone]}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                latest.zone === 'overbought'
                  ? 'bg-red-400'
                  : latest.zone === 'oversold'
                    ? 'bg-green-400'
                    : 'bg-yellow-400'
              }`}
            />
            <span className={zoneColor[latest.zone]}>{zoneLabel[latest.zone]}</span>
          </div>
        )}

        {loading ? (
          <div className="h-[420px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-[var(--text-muted)] text-xs">Carregando dados...</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-[420px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <p className="text-gray-600 text-xs">Dados de volume requerem acesso a BRAPI</p>
            </div>
          </div>
        ) : (
          <>
            {/* Dual chart: Price (top) + NVT Signal with bands (bottom) */}
            <div className="space-y-4 mb-4">
              {/* Price chart */}
              <div>
                <p className="text-[10px] text-[var(--text-muted)] mb-1 font-medium uppercase tracking-wide">
                  Preco (R$)
                </p>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <defs>
                        <linearGradient id="stockNvtPriceGrad" x1="0" y1="0" x2="0" y2="1">
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
                        tickFormatter={(v) => `R$${v.toFixed(0)}`}
                        width={55}
                        domain={[(d: number) => d * 0.98, (d: number) => d * 1.02]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111827',
                          border: '1px solid #374151',
                          borderRadius: '0.75rem',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                        formatter={(v: unknown) => [
                          `R$${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                          'Preco',
                        ]}
                        labelFormatter={(l) => `Data: ${l}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#eab308"
                        strokeWidth={1.5}
                        fill="url(#stockNvtPriceGrad)"
                        dot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* NVT Signal chart with bands */}
              <div>
                <p className="text-[10px] text-[var(--text-muted)] mb-1 font-medium uppercase tracking-wide">
                  NVT Signal + Bandas Desvio Padrao
                </p>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={displayData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <defs>
                        <linearGradient id="stockNvtRedZone" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="stockNvtGreenZone" x1="0" y1="1" x2="0" y2="0">
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
                        contentStyle={{
                          backgroundColor: '#111827',
                          border: '1px solid #374151',
                          borderRadius: '0.75rem',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => {
                          const labels: Record<string, string> = {
                            nvt: 'NVT Signal',
                            nvtMean: 'Media Movel',
                            upper: 'Banda Superior (+2σ)',
                            lower: 'Banda Inferior (-2σ)',
                          };
                          return [Number(value).toFixed(1), labels[name] ?? name];
                        }}
                        labelFormatter={(l) => `Data: ${l}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="upper"
                        stroke="none"
                        fill="url(#stockNvtRedZone)"
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="lower"
                        stroke="none"
                        fill="url(#stockNvtGreenZone)"
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="upper"
                        stroke="#ef4444"
                        strokeWidth={1}
                        strokeDasharray="4 3"
                        dot={false}
                        isAnimationActive={false}
                        name="upper"
                      />
                      <Line
                        type="monotone"
                        dataKey="lower"
                        stroke="#22c55e"
                        strokeWidth={1}
                        strokeDasharray="4 3"
                        dot={false}
                        isAnimationActive={false}
                        name="lower"
                      />
                      <Line
                        type="monotone"
                        dataKey="nvtMean"
                        stroke="#6b7280"
                        strokeWidth={1}
                        dot={false}
                        strokeDasharray="2 2"
                        isAnimationActive={false}
                        name="nvtMean"
                      />
                      <Line
                        type="monotone"
                        dataKey="nvt"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                        name="nvt"
                      />
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
                <span className="w-4 h-0.5 bg-gray-500 inline-block rounded border-dashed border-t" /> Media Movel
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-red-400 inline-block rounded" /> Banda Superior (+2σ)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-green-400 inline-block rounded" /> Banda Inferior (-2σ)
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
                  <p className="text-[10px] text-[var(--text-muted)]">Banda Superior</p>
                  <p className="text-sm font-bold font-mono text-red-400">{latest.upper.toFixed(1)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
                  <p className="text-[10px] text-[var(--text-muted)]">Banda Inferior</p>
                  <p className="text-sm font-bold font-mono text-green-400">{latest.lower.toFixed(1)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
                  <p className="text-[10px] text-[var(--text-muted)]">Sinal</p>
                  <p className={`text-sm font-bold font-mono capitalize ${zoneColor[latest.zone]}`}>
                    {latest.zone === 'overbought'
                      ? 'Sobrecomprado'
                      : latest.zone === 'oversold'
                        ? 'Sobrevendido'
                        : 'Neutro'}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Description */}
        <div className="space-y-3">
          <DescriptionCard
            title="Como o NVT Signal funciona"
            content={`O NVT Signal adaptado para acoes pega o valor total da empresa (Market Cap) e divide pela media movel de 90 dias do volume financeiro diario negociado.\n\nNVT Signal = Market Cap / MM90 do Volume Financeiro Diario\n\nQuando o preco da acao esta alto em relacao ao volume sendo negociado, o NVT Signal sobe — sugerindo que o preco pode estar especulativo e a frente do fundamento. Quando o NVT cai, sugere que ha mais atividade de negociacao relativa, o que pode ser otimista.`}
          />
          <DescriptionCard
            title="Como ler as Bandas de Desvio Padrao"
            content={`As bandas de desvio padrao (±2σ da media movel de 90 dias do proprio NVT) ajudam a identificar extremos.\n\nZona Vermelha (acima da banda superior): A acao esta historicamente sobrecomprada em relacao a sua atividade de negociacao. Pode coincidir com topos locais e pontos de realizacao de lucro.\n\nZona Verde (abaixo da banda inferior): A acao esta historicamente sobrevendida. A atividade de negociacao esta alta em relacao ao preco, sugerindo demanda fundamental forte e zonas potenciais de acumulacao.`}
            collapsed={!expanded}
            onToggle={() => setExpanded(!expanded)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Description Card Helper ──────────────────────────────────────
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
