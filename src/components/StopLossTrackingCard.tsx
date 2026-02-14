'use client';

import { useStopLoss, StopLossConfig } from '@/context/StopLossContext';

function getTypeLabel(type: StopLossConfig['type']): string {
  switch (type) {
    case 'atr': return 'ATR';
    case 'technical': return 'Technical';
    case 'trailing': return 'Trailing';
    case 'ratio': return 'Target R:R';
  }
}

function getTypeColor(type: StopLossConfig['type']): string {
  switch (type) {
    case 'atr': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'technical': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'trailing': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'ratio': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  }
}

function formatPrice(p: number): string {
  if (p >= 1) return '$' + p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + p.toFixed(6);
}

export default function StopLossTrackingCard({
  symbol,
  currentPrice,
}: {
  symbol: string;
  currentPrice?: number;
}) {
  const { getStopLossesForSymbol, removeStopLoss } = useStopLoss();
  const entries = getStopLossesForSymbol(symbol);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
      {entries.map((sl) => {
        const price = currentPrice || sl.entryPrice;
        const pnl = ((price - sl.entryPrice) / sl.entryPrice) * 100;
        const range = sl.targetLevel - sl.stopLevel;
        const progress = range > 0 ? Math.max(0, Math.min(100, ((price - sl.stopLevel) / range) * 100)) : 50;
        const isNearStop = price <= sl.stopLevel * 1.02;
        const isAboveTarget = price >= sl.targetLevel;

        return (
          <div
            key={sl.id}
            className={`bg-[var(--surface)]/50 border rounded-2xl p-6 ${
              isNearStop
                ? 'border-red-500/50 shadow-lg shadow-red-500/10'
                : isAboveTarget
                  ? 'border-green-500/50 shadow-lg shadow-green-500/10'
                  : 'border-[var(--accent)]/30'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h2 className="text-lg font-bold text-[var(--text)]">Stop Loss Strategy</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getTypeColor(sl.type)}`}>
                  {getTypeLabel(sl.type)}
                </span>
              </div>
              <button
                onClick={() => removeStopLoss(sl.id)}
                className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1"
                title="Remove stop loss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Price levels grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Entry Price</p>
                <p className="text-[var(--text)] font-mono text-sm font-bold">{formatPrice(sl.entryPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Current Price</p>
                <p className={`font-mono text-sm font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPrice(price)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Stop Loss</p>
                <p className="text-red-400 font-mono text-sm font-bold">{formatPrice(sl.stopLevel)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Target</p>
                <p className="text-green-400 font-mono text-sm font-bold">{formatPrice(sl.targetLevel)}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1">
                <span>Stop</span>
                <span>Entry</span>
                <span>Target</span>
              </div>
              <div className="relative h-2.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isNearStop
                      ? 'bg-gradient-to-r from-red-600 to-red-500'
                      : isAboveTarget
                        ? 'bg-gradient-to-r from-green-600 to-green-400'
                        : 'bg-gradient-to-r from-red-500 via-yellow-500 to-green-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
                {/* Entry marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-white/60"
                  style={{
                    left: range > 0
                      ? `${((sl.entryPrice - sl.stopLevel) / range) * 100}%`
                      : '50%',
                  }}
                />
              </div>
            </div>

            {/* P&L and details */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold font-mono ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}% P&L
                </span>
                {isNearStop && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full animate-pulse">
                    Near Stop Loss
                  </span>
                )}
                {isAboveTarget && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                    Target Reached
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-600">
                Added {new Date(sl.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Type-specific params */}
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
              {sl.type === 'atr' && (
                <>
                  <span>ATR Period: {sl.atrPeriod || 14}</span>
                  <span>Multiplier: {sl.atrMultiplier || 2}x</span>
                </>
              )}
              {sl.type === 'trailing' && (
                <>
                  <span>Trail: {sl.trailPercent || 5}%</span>
                  <span>R:R: 1:{sl.riskRewardRatio || 3}</span>
                </>
              )}
              {sl.type === 'ratio' && (
                <>
                  <span>Risk: {sl.riskAmount ? formatPrice(sl.riskAmount) : '—'}</span>
                  <span>R:R: 1:{sl.riskRewardRatio || 3}</span>
                </>
              )}
              {sl.type === 'technical' && (
                <>
                  <span>Support: {sl.supportLevel ? formatPrice(sl.supportLevel) : '—'}</span>
                  <span>Resistance: {sl.resistanceLevel ? formatPrice(sl.resistanceLevel) : '—'}</span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
