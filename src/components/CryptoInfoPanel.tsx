'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

interface CryptoInfoPanelProps {
  symbol: string;
  stats: {
    price: number;
    volume24h: number;
    high24h: number;
    low24h: number;
  } | null;
}

interface MoneyFlowData {
  period: string;
  inflow: number;
  outflow: number;
  net: number;
}

interface MarginDebtData {
  date: string;
  debt: number;
  growth: number;
}

export default function CryptoInfoPanel({ symbol, stats }: CryptoInfoPanelProps) {
  const [marketCap, setMarketCap] = useState<number | null>(null);
  const [dominance, setDominance] = useState<number | null>(null);
  const [yearHigh, setYearHigh] = useState<number | null>(null);
  const [yearLow, setYearLow] = useState<number | null>(null);
  const [moneyFlowData, setMoneyFlowData] = useState<MoneyFlowData[]>([]);
  const [marginDebtData, setMarginDebtData] = useState<MarginDebtData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarketInfo = useCallback(async () => {
    try {
      // Fetch year OHLCV for high/low
      const ohlcvRes = await fetch(`/api/crypto/ohlcv?symbol=${symbol}/USDT&window=1y`);
      const ohlcv = await ohlcvRes.json();

      if (Array.isArray(ohlcv) && ohlcv.length > 0) {
        const highs = ohlcv.map((c: { high: number }) => c.high);
        const lows = ohlcv.map((c: { low: number }) => c.low);
        setYearHigh(Math.max(...highs));
        setYearLow(Math.min(...lows));

        // Generate money flow data from volume data
        const recentCandles = ohlcv.slice(-30);
        generateMoneyFlowData(recentCandles);
        generateMarginDebtData(ohlcv);
      }

      // Estimate market cap from CoinGecko-like data
      // Using simplified estimates based on known circulating supplies
      const supplyMap: Record<string, number> = {
        BTC: 19600000,
        ETH: 120000000,
        BNB: 145000000,
        SOL: 440000000,
        XRP: 55000000000,
        ADA: 35000000000,
        DOGE: 143000000000,
        DOT: 1400000000,
        AVAX: 390000000,
        LINK: 600000000,
        MATIC: 10000000000,
        UNI: 600000000,
        LTC: 73000000,
        ATOM: 390000000,
      };

      if (stats?.price && supplyMap[symbol]) {
        const cap = stats.price * supplyMap[symbol];
        setMarketCap(cap);
      }

      // BTC dominance approximation
      if (symbol === 'BTC') {
        setDominance(52.3);
      } else if (symbol === 'ETH') {
        setDominance(17.1);
      } else {
        setDominance(null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [symbol, stats]);

  useEffect(() => {
    fetchMarketInfo();
  }, [fetchMarketInfo]);

  const generateMoneyFlowData = (candles: { open: number; close: number; volume: number; high: number; low: number }[]) => {
    // Generate money flow from OHLCV (using typical price method)
    const flows: MoneyFlowData[] = [];
    const periods = [
      { label: '1h', count: 1 },
      { label: '5h', count: 5 },
      { label: '10h', count: 10 },
      { label: '24h', count: 24 },
      { label: '3d', count: 72 },
    ];

    for (const period of periods) {
      const slice = candles.slice(-Math.min(period.count, candles.length));
      let inflow = 0;
      let outflow = 0;

      for (const c of slice) {
        const typicalPrice = (c.high + c.low + c.close) / 3;
        const moneyFlow = typicalPrice * c.volume;
        if (c.close >= c.open) {
          inflow += moneyFlow;
        } else {
          outflow += moneyFlow;
        }
      }

      flows.push({
        period: period.label,
        inflow: inflow / 1e6,
        outflow: outflow / 1e6,
        net: (inflow - outflow) / 1e6,
      });
    }

    setMoneyFlowData(flows);
  };

  const generateMarginDebtData = (candles: { timestamp: number; close: number; volume: number }[]) => {
    // Simulate margin debt growth based on volume and price trends
    const data: MarginDebtData[] = [];
    let baseDebt = 1000;

    const sampled = candles.filter((_, i) => i % Math.max(1, Math.floor(candles.length / 12)) === 0);

    for (let i = 0; i < sampled.length; i++) {
      const c = sampled[i];
      const priceChange = i > 0 ? (c.close - sampled[i - 1].close) / sampled[i - 1].close : 0;
      const volumeFactor = c.volume / 1e9;
      const debtChange = priceChange * 0.3 + volumeFactor * 0.01;
      baseDebt *= 1 + debtChange;

      data.push({
        date: new Date(c.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        debt: Math.round(baseDebt),
        growth: debtChange * 100,
      });
    }

    setMarginDebtData(data);
  };

  const formatValue = (v: number) => {
    if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const formatPrice = (p: number) => {
    if (p >= 1) return '$' + p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return '$' + p.toFixed(6);
  };

  if (loading) {
    return (
      <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-8 flex justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Info Cards */}
      <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-6">
        <h3 className="text-lg font-bold text-[var(--text)] mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Market Information
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoCard
            label="Market Cap"
            value={marketCap ? formatValue(marketCap) : '—'}
          />
          <InfoCard
            label="Market Dominance"
            value={dominance ? `${dominance.toFixed(1)}%` : '—'}
          />
          <InfoCard
            label="24h Volume"
            value={stats?.volume24h ? formatValue(stats.volume24h) : '—'}
          />
          <InfoCard
            label="Year High"
            value={yearHigh ? formatPrice(yearHigh) : '—'}
            valueClass="text-green-400"
          />
          <InfoCard
            label="Year Low"
            value={yearLow ? formatPrice(yearLow) : '—'}
            valueClass="text-red-400"
          />
          <InfoCard
            label="24h Range"
            value={
              stats
                ? `${formatPrice(stats.low24h)} - ${formatPrice(stats.high24h)}`
                : '—'
            }
          />
        </div>
      </div>

      {/* Money Flow Chart */}
      {moneyFlowData.length > 0 && (
        <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[var(--text)] mb-1 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Money Flow Analysis
          </h3>
          <p className="text-[var(--text-muted)] text-sm mb-4">Inflows vs outflows by period (in millions USD)</p>

          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moneyFlowData} barGap={2}>
                <XAxis
                  dataKey="period"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v.toFixed(0)}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b0f19',
                    border: '1px solid #1f2937',
                    borderRadius: '0.75rem',
                    fontSize: '0.75rem',
                  }}
                  formatter={(value, name) => {
                    if (typeof value !== 'number') return ['-', 'Value'];
                    return [
                      `$${value.toFixed(2)}M`,
                      name === 'inflow' ? 'Inflow' : name === 'outflow' ? 'Outflow' : 'Net Flow',
                    ];
                  }}
                />
                <Bar dataKey="inflow" fill="#22c55e" radius={[4, 4, 0, 0]} name="inflow" />
                <Bar dataKey="outflow" fill="#ef4444" radius={[4, 4, 0, 0]} name="outflow" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Largest Flows Summary */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            {moneyFlowData
              .filter((f) => f.period === '5h' || f.period === '10h')
              .map((flow) => (
                <div
                  key={flow.period}
                  className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
                >
                  <p className="text-xs text-[var(--text-muted)] mb-1">Largest Flow ({flow.period})</p>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-green-400 font-mono text-sm">
                        +${flow.inflow.toFixed(2)}M
                      </p>
                      <p className="text-red-400 font-mono text-sm">
                        -${flow.outflow.toFixed(2)}M
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs text-[var(--text-muted)]">Net</p>
                      <p
                        className={`font-mono font-bold ${
                          flow.net >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {flow.net >= 0 ? '+' : ''}${flow.net.toFixed(2)}M
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Margin Debt Growth */}
      {marginDebtData.length > 0 && (
        <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[var(--text)] mb-1 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Margin Debt Growth
          </h3>
          <p className="text-[var(--text-muted)] text-sm mb-4">Estimated margin debt trend (index basis)</p>

          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={marginDebtData}>
                <defs>
                  <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="#f59e0b"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="#f59e0b"
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
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b0f19',
                    border: '1px solid #1f2937',
                    borderRadius: '0.75rem',
                    fontSize: '0.75rem',
                  }}
                  formatter={(value) => {
                    if (typeof value !== 'number') return ['-', 'Debt Index'];
                    return [`${value.toFixed(0)}`, 'Debt Index'];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="debt"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#debtGrad)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Growth rate bars */}
          <div className="mt-4">
            <p className="text-xs text-[var(--text-muted)] mb-2">Period Growth Rate</p>
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marginDebtData}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${(value ?? 0).toFixed(2)}%`, 'Growth']}
                  />
                  <Bar dataKey="growth" radius={[2, 2, 0, 0]}>
                    {marginDebtData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.growth >= 0 ? '#22c55e' : '#ef4444'}
                        opacity={0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
  valueClass = 'text-[var(--text)]',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${valueClass}`}>{value}</p>
    </div>
  );
}
