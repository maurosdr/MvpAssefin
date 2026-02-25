'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { usePortfolio } from '@/context/PortfolioContext';

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

export default function PortfolioAllocation() {
  const { summary } = usePortfolio();

  if (!summary || summary.assets.length === 0) {
    return (
      <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-6">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">Asset Allocation</h2>
        <div className="h-[250px] flex items-center justify-center text-[var(--text-muted)] text-sm">
          No assets to display
        </div>
      </div>
    );
  }

  // Take top 8 assets + aggregate the rest as "Others"
  const topAssets = summary.assets.slice(0, 8);
  const otherAssets = summary.assets.slice(8);
  const otherValue = otherAssets.reduce((sum, a) => sum + a.value, 0);
  const otherAllocation = otherAssets.reduce((sum, a) => sum + a.allocation, 0);

  const chartData = topAssets.map((a) => ({
    name: a.symbol,
    value: a.value,
    allocation: a.allocation,
  }));

  if (otherValue > 0) {
    chartData.push({ name: 'Others', value: otherValue, allocation: otherAllocation });
  }

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-6">
      <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
        Asset Allocation
      </h2>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="w-[200px] h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0b0f19',
                  border: '1px solid #1f2937',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                }}
                formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Value']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2 w-full">
          {chartData.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-sm text-[var(--text)]">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-muted)] font-mono">
                  ${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-[var(--text-muted)] font-mono w-12 text-right">
                  {item.allocation.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
