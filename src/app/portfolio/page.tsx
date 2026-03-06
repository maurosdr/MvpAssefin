'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import Footer from '@/components/Footer';
import AddPositionModal from '@/components/AddPositionModal';
import PortfolioConcentrationChart from '@/components/PortfolioConcentrationChart';
import PortfolioReturnsChart from '@/components/PortfolioReturnsChart';
import PortfolioDrawdownChart from '@/components/PortfolioDrawdownChart';
import PortfolioVolatilityChart from '@/components/PortfolioVolatilityChart';
import PortfolioPositionsTable from '@/components/PortfolioPositionsTable';
import AdvancedIndicatorsTab from '@/components/AdvancedIndicatorsTab';
import { usePortfolio } from '@/context/PortfolioContext';
import { useExchange } from '@/context/ExchangeContext';
import { usePredictionMarkets } from '@/context/PredictionMarketContext';
import { PortfolioChartPosition, PortfolioHistoryPoint, PortfolioStats } from '@/types/portfolio';
import {
  calculateMaxDrawdown,
  calculatePortfolioVolatility,
  calculateSharpeRatio,
  calculateDailyReturns,
} from '@/lib/portfolio-calculations';

export default function PortfolioPage() {
  const { positions: manualPositions, removePosition, refreshCurrentPrices, loading: priceLoading } = usePortfolio();
  const { allPositions, allTotalValue, connectedExchanges } = useExchange();
  const { kalshiEnabled, polymarketEnabled } = usePredictionMarkets();

  const [showAddModal, setShowAddModal] = useState(false);
  const [backtestData, setBacktestData] = useState<PortfolioHistoryPoint[]>([]);
  const [activeTab, setActiveTab] = useState<'carteira' | 'indicadores'>('carteira');

  // Refresh prices on mount
  useEffect(() => {
    refreshCurrentPrices();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build unified positions list for display
  const allChartPositions = useMemo<PortfolioChartPosition[]>(() => {
    const positions: PortfolioChartPosition[] = [];

    // Crypto positions from exchanges
    for (const pos of allPositions) {
      if (pos.usdValue > 0.01) {
        positions.push({
          symbol: pos.asset,
          name: pos.asset,
          type: 'crypto',
          value: pos.usdValue,
          weight: 0, // calculated below
          currentPrice: pos.total > 0 ? pos.usdValue / pos.total : 0,
          quantity: pos.total,
        });
      }
    }

    // Manual positions (stocks, ETFs, BDRs, predictions)
    for (const pos of manualPositions) {
      const currentPrice = pos.currentPrice || pos.entryPrice;
      const value = currentPrice * pos.quantity;
      const returnPct =
        pos.entryPrice > 0
          ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
          : 0;

      positions.push({
        symbol: pos.type === 'prediction' ? (pos.side || 'YES') : pos.symbol,
        name: pos.name,
        type: pos.type,
        value,
        weight: 0,
        returnPct,
        entryDate: pos.entryDate,
        entryPrice: pos.entryPrice,
        currentPrice,
        quantity: pos.quantity,
        side: pos.side,
      });
    }

    // Calculate weights
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
    for (const pos of positions) {
      pos.weight = totalValue > 0 ? (pos.value / totalValue) * 100 : 0;
    }

    return positions.sort((a, b) => b.value - a.value);
  }, [allPositions, manualPositions]);

  // Calculate portfolio stats
  const stats = useMemo<PortfolioStats>(() => {
    const totalValue = allChartPositions.reduce((sum, p) => sum + p.value, 0);

    // Calculate total return from manual positions (crypto has no entry price)
    const manualValue = manualPositions.reduce((sum, p) => {
      const curr = p.currentPrice || p.entryPrice;
      return sum + curr * p.quantity;
    }, 0);
    const manualCost = manualPositions.reduce(
      (sum, p) => sum + p.entryPrice * p.quantity,
      0
    );
    const totalReturn = manualValue - manualCost;
    const totalReturnPct = manualCost > 0 ? (totalReturn / manualCost) * 100 : 0;

    // Use backtest data for vol, sharpe, max dd if available
    let volatility = 0;
    let sharpeRatio = 0;
    let maxDrawdown = 0;

    if (backtestData.length > 1) {
      const values = backtestData.map((d) => d.value);
      const dailyReturns = calculateDailyReturns(values);
      volatility = calculatePortfolioVolatility(dailyReturns);
      sharpeRatio = calculateSharpeRatio(dailyReturns);
      maxDrawdown = calculateMaxDrawdown(values);
    }

    return {
      totalValue: totalValue + allTotalValue * (allPositions.length === 0 ? 0 : 0), // avoid double count
      totalReturn,
      totalReturnPct,
      volatility,
      sharpeRatio,
      maxDrawdown,
    };
  }, [allChartPositions, manualPositions, backtestData, allTotalValue, allPositions]);

  // Total portfolio value
  const totalPortfolioValue = allChartPositions.reduce((sum, p) => sum + p.value, 0);

  // Handle remove
  const handleRemove = useCallback(
    (symbol: string, type: string) => {
      const pos = manualPositions.find(
        (p) => (p.type === 'prediction' ? p.side === symbol : p.symbol === symbol) && p.type === type
      );
      if (pos) removePosition(pos.id);
    },
    [manualPositions, removePosition]
  );

  // Crypto symbols for backtest
  const cryptoSymbols = allPositions
    .filter((p) => p.usdValue > 1)
    .map((p) => p.asset);

  const formatCurrency = (value: number, usd = false) => {
    if (usd) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="pt-[120px] pb-16 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto">
        {/* Page Title + Add Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)]">Portfolio</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {connectedExchanges.length > 0 && (
                <span className="text-green-400">{connectedExchanges.length} exchange(s) conectada(s)</span>
              )}
              {(kalshiEnabled || polymarketEnabled) && (
                <span className="text-purple-400 ml-2">
                  {[kalshiEnabled && 'Kalshi', polymarketEnabled && 'Polymarket'].filter(Boolean).join(' + ')} ativo(s)
                </span>
              )}
              {manualPositions.length > 0 && (
                <span className="text-[var(--text-secondary)] ml-2">
                  {manualPositions.length} posição(ões) manual(is)
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)] transition-all active:scale-95 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Adicionar Posição</span>
            <span className="sm:hidden">Adicionar</span>
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-0 border-b border-[var(--border)] mb-6">
          {(['carteira', 'indicadores'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-[var(--accent)] text-[var(--text)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {tab === 'carteira' ? 'Carteira' : 'Indicadores Avançados'}
            </button>
          ))}
        </div>

        {/* ── Carteira Tab ── */}
        {activeTab === 'carteira' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
              <StatCard
                label="Valor Total"
                value={formatCurrency(totalPortfolioValue, allChartPositions.some((p) => p.type === 'crypto'))}
                color="text-[var(--text)]"
              />
              <StatCard
                label="Rentabilidade"
                value={`${stats.totalReturnPct >= 0 ? '+' : ''}${stats.totalReturnPct.toFixed(2)}%`}
                subValue={formatCurrency(stats.totalReturn, false)}
                color={stats.totalReturnPct >= 0 ? 'text-green-400' : 'text-red-400'}
              />
              <StatCard
                label="Volatilidade"
                value={stats.volatility > 0 ? `${stats.volatility.toFixed(2)}%` : '—'}
                color="text-[var(--accent)]"
              />
              <StatCard
                label="Sharpe Ratio"
                value={stats.sharpeRatio !== 0 ? stats.sharpeRatio.toFixed(2) : '—'}
                color={stats.sharpeRatio > 0 ? 'text-green-400' : stats.sharpeRatio < 0 ? 'text-red-400' : 'text-[var(--text-muted)]'}
              />
              <StatCard
                label="Max Drawdown"
                value={stats.maxDrawdown > 0 ? `-${stats.maxDrawdown.toFixed(2)}%` : '—'}
                color="text-red-400"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <PortfolioConcentrationChart positions={allChartPositions} />
              <PortfolioReturnsChart
                positions={manualPositions}
                cryptoSymbols={cryptoSymbols}
                onBacktestData={setBacktestData}
              />
              <PortfolioDrawdownChart data={backtestData} />
              <PortfolioVolatilityChart data={backtestData} />
            </div>

            {/* Positions Table */}
            <PortfolioPositionsTable
              positions={allChartPositions}
              onRemove={handleRemove}
            />
          </>
        )}

        {/* ── Indicadores Avançados Tab ── */}
        {activeTab === 'indicadores' && (
          <AdvancedIndicatorsTab
            positions={allChartPositions}
            manualPositions={manualPositions}
            cryptoSymbols={cryptoSymbols}
          />
        )}

        {priceLoading && (
          <div className="fixed bottom-4 right-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[var(--text-muted)]">Atualizando preços...</span>
          </div>
        )}
      </main>

      <Footer />
      <AddPositionModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
  color,
}: {
  label: string;
  value: string;
  subValue?: string;
  color: string;
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-lg sm:text-xl font-bold ${color}`}>{value}</p>
      {subValue && (
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{subValue}</p>
      )}
    </div>
  );
}
