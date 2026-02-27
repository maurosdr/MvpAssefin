'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface EquityPoint {
  date: string;
  value: number;
}

interface Trade {
  date: string;
  type: 'buy' | 'sell';
  price: number;
  size: number;
  pnl: number;
}

interface BacktestStats {
  totalReturn: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalTrades: number;
  initialCapital: number;
  finalCapital: number;
}

export interface BacktestResults {
  equity: EquityPoint[];
  trades: Trade[];
  stats: BacktestStats;
}

interface BacktestChartProps {
  results: BacktestResults | null;
  loading: boolean;
  strategyName?: string;
}

const formatCurrency = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;

const formatDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

interface TooltipPayload {
  value: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-[var(--text-muted)] mb-1">{label}</p>
      <p className="font-bold text-[var(--text-primary)]">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

function StatCard({
  label,
  value,
  suffix = '',
  positive,
}: {
  label: string;
  value: number;
  suffix?: string;
  positive?: boolean;
}) {
  const isPositive = positive !== undefined ? positive : value >= 0;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">{label}</span>
      <span className={`text-lg font-black font-mono ${isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
        {value >= 0 && suffix !== '%' ? '' : ''}
        {value > 0 && '+'}
        {value.toFixed(2)}
        {suffix}
      </span>
    </div>
  );
}

export default function BacktestChart({ results, loading, strategyName }: BacktestChartProps) {
  if (loading) {
    return (
      <div className="modern-card flex flex-col items-center justify-center h-[720px] gap-4">
        <div className="w-12 h-12 border-3 border-[var(--accent)] border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
        <div className="text-center">
          <p className="text-[var(--text-primary)] font-semibold text-sm">Executando Backtest</p>
          <p className="text-[var(--text-muted)] text-xs mt-1">Buscando dados históricos e simulando a estratégia...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="modern-card flex flex-col items-center justify-center h-[720px] gap-6 text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-3xl">
          📊
        </div>
        <div>
          <p className="text-[var(--text-primary)] font-semibold text-base mb-2">Resultados do Backtest</p>
          <p className="text-[var(--text-muted)] text-sm max-w-xs">
            Quando a IA gerar uma estratégia de backtest, os resultados visuais aparecerão aqui automaticamente.
          </p>
        </div>
        <div className="w-full space-y-2 max-w-xs">
          {['Curva de Equity', 'Lista de Trades', 'Estatísticas'].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text-muted)]"
            >
              <div className="w-2 h-2 rounded-full bg-[var(--border)]" />
              {item}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { equity, trades, stats } = results;
  const initialValue = equity[0]?.value ?? stats.initialCapital;
  const isProfit = stats.totalReturn >= 0;
  const accentColor = isProfit ? 'var(--success)' : 'var(--danger)';

  // Thin out equity for chart performance
  const chartData = equity.length > 300
    ? equity.filter((_, i) => i % Math.ceil(equity.length / 300) === 0)
    : equity;

  const sellTrades = trades.filter((t) => t.type === 'sell').slice(-20);

  return (
    <div className="modern-card flex flex-col h-[720px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-lg">
            📈
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[200px]">
              {strategyName ?? 'Resultados do Backtest'}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">Simulação histórica</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${isProfit ? 'bg-[var(--success-soft)] text-[var(--success)]' : 'bg-[var(--danger-soft)] text-[var(--danger)]'}`}>
          {stats.totalReturn >= 0 ? '+' : ''}{stats.totalReturn.toFixed(2)}%
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-2 p-4 pb-2">
          <StatCard label="Retorno Total" value={stats.totalReturn} suffix="%" />
          <StatCard label="Win Rate" value={stats.winRate} suffix="%" positive={stats.winRate >= 50} />
          <StatCard label="Max Drawdown" value={-stats.maxDrawdown} suffix="%" />
          <StatCard label="Sharpe Ratio" value={stats.sharpeRatio} positive={stats.sharpeRatio >= 1} />
        </div>

        {/* Capital summary */}
        <div className="mx-4 mb-3 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="text-[var(--text-muted)]">Capital Inicial</span>
            <div className="font-bold text-[var(--text-primary)] font-mono">{formatCurrency(stats.initialCapital)}</div>
          </div>
          <div className="text-[var(--text-muted)]">→</div>
          <div className="text-right">
            <span className="text-[var(--text-muted)]">Capital Final</span>
            <div className={`font-bold font-mono ${isProfit ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {formatCurrency(stats.finalCapital)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[var(--text-muted)]">Nº Trades</span>
            <div className="font-bold text-[var(--text-primary)] font-mono">{stats.totalTrades}</div>
          </div>
        </div>

        {/* Equity Curve */}
        <div className="px-4 pb-3">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Curva de Equity</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={initialValue} stroke="var(--text-muted)" strokeDasharray="4 4" strokeOpacity={0.5} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={accentColor}
                  strokeWidth={2}
                  fill="url(#equityGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: accentColor, stroke: 'var(--bg)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trades table */}
        {sellTrades.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Últimos Trades ({sellTrades.length})
            </p>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {sellTrades.map((trade, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${trade.pnl >= 0 ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`}
                    />
                    <span className="text-[var(--text-muted)] font-mono">{trade.date}</span>
                  </div>
                  <span className="text-[var(--text-secondary)] font-mono">${trade.price.toFixed(2)}</span>
                  <span
                    className={`font-bold font-mono ${trade.pnl >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}
                  >
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
