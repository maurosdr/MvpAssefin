'use client';

import { usePortfolio } from '@/context/PortfolioContext';

interface MetricProps {
  label: string;
  value: string;
  color: string;
  tooltip: string;
}

function Metric({ label, value, color, tooltip }: MetricProps) {
  return (
    <div className="bg-gray-800/40 rounded-xl p-4" title={tooltip}>
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}

export default function PortfolioRiskCard() {
  const { summary } = usePortfolio();

  const metrics = summary?.riskMetrics;

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-6">
      <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        Risk Metrics
      </h2>

      {!metrics ? (
        <div className="text-[var(--text-muted)] text-sm text-center py-8">
          Connect an exchange to see risk metrics
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Volatility (ann.)"
            value={`${metrics.volatility.toFixed(1)}%`}
            color={metrics.volatility > 30 ? 'text-red-400' : metrics.volatility > 15 ? 'text-yellow-400' : 'text-green-400'}
            tooltip="Annualized volatility based on daily returns"
          />
          <Metric
            label="Sharpe Ratio"
            value={metrics.sharpeRatio.toFixed(2)}
            color={metrics.sharpeRatio > 1 ? 'text-green-400' : metrics.sharpeRatio > 0 ? 'text-yellow-400' : 'text-red-400'}
            tooltip="Risk-adjusted return (higher is better)"
          />
          <Metric
            label="Max Drawdown"
            value={`-${metrics.maxDrawdown.toFixed(1)}%`}
            color={metrics.maxDrawdown > 20 ? 'text-red-400' : metrics.maxDrawdown > 10 ? 'text-yellow-400' : 'text-green-400'}
            tooltip="Largest peak-to-trough decline"
          />
          <Metric
            label="Daily Return"
            value={`${metrics.dailyReturn >= 0 ? '+' : ''}${metrics.dailyReturn.toFixed(3)}%`}
            color={metrics.dailyReturn >= 0 ? 'text-green-400' : 'text-red-400'}
            tooltip="Average daily return"
          />
        </div>
      )}
    </div>
  );
}
