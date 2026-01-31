'use client';

import { useState, useCallback, useMemo } from 'react';
import { useBinance } from '@/context/BinanceContext';

type StressTestType = 'historical' | 'montecarlo' | 'cvar' | 'custom' | 'correlation';

interface HistoricalVaRResult {
  var1Pct: number;
  var5Pct: number;
  var1PctDollar: number;
  var5PctDollar: number;
  windowUsed: number;
  dataPoints: number;
}

interface MonteCarloVaRResult {
  var1Pct: number;
  var5Pct: number;
  var1PctDollar: number;
  var5PctDollar: number;
  expectedReturn: number;
  volatility: number;
  simulationsRun: number;
  worstCase: number;
  bestCase: number;
}

interface CVaRResult {
  var: number;
  cvar: number;
  varDollar: number;
  cvarDollar: number;
  tailRiskMultiple: number;
}

interface CustomScenarioResult {
  scenarioName: string;
  portfolioLoss: number;
  portfolioLossPercent: number;
  assetImpacts: { asset: string; loss: number; lossPercent: number }[];
}

interface CorrelationResult {
  shockAsset: string;
  shockPercent: number;
  cascadeEffects: { asset: string; expectedImpact: number; contribution: number }[];
  totalPortfolioImpact: number;
  totalPortfolioImpactPercent: number;
}

interface RiskManagementProps {
  symbol: string;
  currentPrice?: number;
}

export default function RiskManagement({ symbol, currentPrice }: RiskManagementProps) {
  const { positions, connected } = useBinance();

  // Form state
  const [selectedTest, setSelectedTest] = useState<StressTestType>('historical');
  const [windowSize, setWindowSize] = useState(365);
  const [numSimulations, setNumSimulations] = useState(10000);
  const [timeHorizon, setTimeHorizon] = useState(30);
  const [confidenceLevel, setConfidenceLevel] = useState(5);
  const [portfolioValue, setPortfolioValue] = useState(10000);

  // Custom scenario state
  const [customScenario, setCustomScenario] = useState({
    name: 'BTC Crash + DeFi Collapse',
    shocks: [
      { asset: 'BTC', shock: -40 },
      { asset: 'ETH', shock: -50 },
      { asset: 'UNI', shock: -70 },
      { asset: 'LINK', shock: -60 },
    ],
  });

  // Correlation scenario state
  const [shockAsset, setShockAsset] = useState('BTC');
  const [shockPercent, setShockPercent] = useState(-30);

  // Results state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historicalResult, setHistoricalResult] = useState<HistoricalVaRResult | null>(null);
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloVaRResult | null>(null);
  const [cvarResult, setCvarResult] = useState<CVaRResult | null>(null);
  const [customResult, setCustomResult] = useState<CustomScenarioResult | null>(null);
  const [correlationResult, setCorrelationResult] = useState<CorrelationResult | null>(null);

  // Calculate portfolio from Binance positions if connected
  const portfolio = useMemo(() => {
    if (connected && positions.length > 0) {
      return { positions: positions.map((p) => ({ asset: p.asset, value: p.usdValue })) };
    }
    return {
      positions: [
        { asset: symbol, value: portfolioValue * 0.4 },
        { asset: 'ETH', value: portfolioValue * 0.3 },
        { asset: 'SOL', value: portfolioValue * 0.15 },
        { asset: 'LINK', value: portfolioValue * 0.15 },
      ],
    };
  }, [connected, positions, symbol, portfolioValue]);

  const runStressTest = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const basePayload = {
        symbol,
        portfolioValue: connected ? positions.reduce((sum, p) => sum + p.usdValue, 0) : portfolioValue,
      };

      let payload: Record<string, unknown>;

      switch (selectedTest) {
        case 'historical':
          payload = { ...basePayload, type: 'historical', windowSize };
          break;
        case 'montecarlo':
          payload = { ...basePayload, type: 'montecarlo', numSimulations, timeHorizon };
          break;
        case 'cvar':
          payload = { ...basePayload, type: 'cvar', confidenceLevel: confidenceLevel / 100 };
          break;
        case 'custom':
          payload = { ...basePayload, type: 'custom', portfolio, scenario: customScenario };
          break;
        case 'correlation':
          payload = { ...basePayload, type: 'correlation', portfolio, shockAsset, shockPercent };
          break;
        default:
          throw new Error('Invalid test type');
      }

      const response = await fetch('/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Calculation failed');
      }

      switch (selectedTest) {
        case 'historical':
          setHistoricalResult(data.result);
          break;
        case 'montecarlo':
          setMonteCarloResult(data.result);
          break;
        case 'cvar':
          setCvarResult(data.result);
          break;
        case 'custom':
          setCustomResult(data.result);
          break;
        case 'correlation':
          setCorrelationResult(data.result);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [
    selectedTest,
    symbol,
    portfolioValue,
    windowSize,
    numSimulations,
    timeHorizon,
    confidenceLevel,
    customScenario,
    shockAsset,
    shockPercent,
    portfolio,
    connected,
    positions,
  ]);

  const formatCurrency = (value: number) =>
    '$' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatPercent = (value: number) => value.toFixed(2) + '%';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Risk Management & Stress Testing
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Run VaR calculations and stress scenarios on your portfolio
            </p>
          </div>
          {currentPrice && (
            <div className="text-right">
              <p className="text-xs text-gray-500">{symbol} Price</p>
              <p className="text-lg font-bold text-white font-mono">{formatCurrency(currentPrice)}</p>
            </div>
          )}
        </div>

        {connected && positions.length > 0 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
            <p className="text-green-400 text-sm">
              Using live Binance portfolio ({positions.length} positions, {formatCurrency(positions.reduce((sum, p) => sum + p.usdValue, 0))} total value)
            </p>
          </div>
        )}

        {/* Test Type Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
          {[
            { type: 'historical' as const, label: 'Historical VaR', color: 'blue' },
            { type: 'montecarlo' as const, label: 'Monte Carlo', color: 'purple' },
            { type: 'cvar' as const, label: 'CVaR/ES', color: 'orange' },
            { type: 'custom' as const, label: 'Custom', color: 'pink' },
            { type: 'correlation' as const, label: 'Correlation', color: 'cyan' },
          ].map(({ type, label, color }) => (
            <button
              key={type}
              onClick={() => setSelectedTest(type)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedTest === type
                  ? `bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`
                  : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800'
              }`}
              style={{
                backgroundColor: selectedTest === type ? `var(--${color}-500-20, rgba(59, 130, 246, 0.2))` : undefined,
                borderColor: selectedTest === type ? `var(--${color}-500-30, rgba(59, 130, 246, 0.3))` : undefined,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Parameters based on selected test */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
          <h3 className="text-white font-semibold text-sm mb-4">Parameters</h3>

          {selectedTest === 'historical' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1">Rolling Window (days)</label>
                <input
                  type="number"
                  min={30}
                  max={500}
                  value={windowSize}
                  onChange={(e) => setWindowSize(parseInt(e.target.value) || 365)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
                <p className="text-gray-600 text-xs mt-1">Recommended: 250-500 days for crypto (7-day/week)</p>
              </div>
              {!connected && (
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Portfolio Value ($)</label>
                  <input
                    type="number"
                    min={100}
                    value={portfolioValue}
                    onChange={(e) => setPortfolioValue(parseInt(e.target.value) || 10000)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {selectedTest === 'montecarlo' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1">Simulations</label>
                <input
                  type="number"
                  min={1000}
                  max={50000}
                  step={1000}
                  value={numSimulations}
                  onChange={(e) => setNumSimulations(parseInt(e.target.value) || 10000)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
                <p className="text-gray-600 text-xs mt-1">GJR-GARCH paths</p>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">Time Horizon (days)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={timeHorizon}
                  onChange={(e) => setTimeHorizon(parseInt(e.target.value) || 30)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              {!connected && (
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Portfolio Value ($)</label>
                  <input
                    type="number"
                    min={100}
                    value={portfolioValue}
                    onChange={(e) => setPortfolioValue(parseInt(e.target.value) || 10000)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {selectedTest === 'cvar' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1">Confidence Level (%)</label>
                <select
                  value={confidenceLevel}
                  onChange={(e) => setConfidenceLevel(parseInt(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                >
                  <option value={1}>1% (Extreme tail)</option>
                  <option value={5}>5% (Standard)</option>
                  <option value={10}>10% (Conservative)</option>
                </select>
                <p className="text-gray-600 text-xs mt-1">Expected Shortfall beyond VaR threshold</p>
              </div>
              {!connected && (
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Portfolio Value ($)</label>
                  <input
                    type="number"
                    min={100}
                    value={portfolioValue}
                    onChange={(e) => setPortfolioValue(parseInt(e.target.value) || 10000)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {selectedTest === 'custom' && (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1">Scenario Name</label>
                <input
                  type="text"
                  value={customScenario.name}
                  onChange={(e) => setCustomScenario({ ...customScenario, name: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-pink-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {customScenario.shocks.map((shock, i) => (
                  <div key={i} className="bg-gray-900 rounded-lg p-2">
                    <input
                      type="text"
                      value={shock.asset}
                      onChange={(e) => {
                        const newShocks = [...customScenario.shocks];
                        newShocks[i].asset = e.target.value;
                        setCustomScenario({ ...customScenario, shocks: newShocks });
                      }}
                      className="w-full bg-transparent border-none text-white text-xs font-mono focus:outline-none mb-1"
                      placeholder="Asset"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={shock.shock}
                        onChange={(e) => {
                          const newShocks = [...customScenario.shocks];
                          newShocks[i].shock = parseFloat(e.target.value) || 0;
                          setCustomScenario({ ...customScenario, shocks: newShocks });
                        }}
                        className="w-full bg-transparent border-none text-red-400 text-sm font-mono focus:outline-none"
                      />
                      <span className="text-gray-500 text-xs">%</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-gray-600 text-xs">
                Example scenarios: BTC -40% + DeFi -70%, Stablecoin depeg -10%
              </p>
            </div>
          )}

          {selectedTest === 'correlation' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1">Shock Asset</label>
                <select
                  value={shockAsset}
                  onChange={(e) => setShockAsset(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                >
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="SOL">Solana (SOL)</option>
                  <option value="USDT">Tether (USDT)</option>
                  <option value="USDC">USD Coin (USDC)</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">Shock Magnitude (%)</label>
                <input
                  type="number"
                  value={shockPercent}
                  onChange={(e) => setShockPercent(parseFloat(e.target.value) || -30)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
                <p className="text-gray-600 text-xs mt-1">Propagates through correlation matrix</p>
              </div>
            </div>
          )}
        </div>

        {/* Run Button */}
        <button
          onClick={runStressTest}
          disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Running Simulation...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Run Stress Test
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {historicalResult && selectedTest === 'historical' && (
        <div className="bg-gray-900/50 border border-blue-500/30 rounded-2xl p-6">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            Historical VaR Results
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ResultCard label="VaR (1%)" value={formatPercent(historicalResult.var1Pct)} subValue={formatCurrency(historicalResult.var1PctDollar)} color="red" />
            <ResultCard label="VaR (5%)" value={formatPercent(historicalResult.var5Pct)} subValue={formatCurrency(historicalResult.var5PctDollar)} color="orange" />
            <ResultCard label="Window Used" value={`${historicalResult.windowUsed} days`} subValue="Rolling period" color="blue" />
            <ResultCard label="Data Points" value={historicalResult.dataPoints.toString()} subValue="Total returns" color="gray" />
          </div>
          <p className="text-gray-500 text-xs mt-4">
            Based on {historicalResult.windowUsed} days of historical 7-day/week crypto returns
          </p>
        </div>
      )}

      {monteCarloResult && selectedTest === 'montecarlo' && (
        <div className="bg-gray-900/50 border border-purple-500/30 rounded-2xl p-6">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full" />
            Monte Carlo VaR Results (GJR-GARCH)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <ResultCard label="VaR (1%)" value={formatPercent(monteCarloResult.var1Pct)} subValue={formatCurrency(monteCarloResult.var1PctDollar)} color="red" />
            <ResultCard label="VaR (5%)" value={formatPercent(monteCarloResult.var5Pct)} subValue={formatCurrency(monteCarloResult.var5PctDollar)} color="orange" />
            <ResultCard label="Expected Return" value={formatPercent(monteCarloResult.expectedReturn)} subValue={`${timeHorizon} day horizon`} color="green" />
            <ResultCard label="Simulated Vol" value={formatPercent(monteCarloResult.volatility)} subValue="GJR-GARCH" color="purple" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <ResultCard label="Worst Case" value={formatPercent(monteCarloResult.worstCase)} color="red" />
            <ResultCard label="Best Case" value={formatPercent(monteCarloResult.bestCase)} color="green" />
            <ResultCard label="Simulations" value={monteCarloResult.simulationsRun.toLocaleString()} subValue="Paths generated" color="gray" />
          </div>
        </div>
      )}

      {cvarResult && selectedTest === 'cvar' && (
        <div className="bg-gray-900/50 border border-orange-500/30 rounded-2xl p-6">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full" />
            CVaR / Expected Shortfall Results
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ResultCard label={`VaR (${confidenceLevel}%)`} value={formatPercent(cvarResult.var)} subValue={formatCurrency(cvarResult.varDollar)} color="orange" />
            <ResultCard label={`CVaR (${confidenceLevel}%)`} value={formatPercent(cvarResult.cvar)} subValue={formatCurrency(cvarResult.cvarDollar)} color="red" />
            <ResultCard label="Tail Risk Multiple" value={cvarResult.tailRiskMultiple.toFixed(2) + 'x'} subValue="CVaR/VaR ratio" color="purple" />
            <ResultCard label="Avg Tail Loss" value={formatCurrency(cvarResult.cvarDollar)} subValue="Expected if VaR breached" color="red" />
          </div>
          <p className="text-gray-500 text-xs mt-4">
            CVaR measures the average loss in the worst {confidenceLevel}% of scenarios - more informative for crypto&apos;s fat tails
          </p>
        </div>
      )}

      {customResult && selectedTest === 'custom' && (
        <div className="bg-gray-900/50 border border-pink-500/30 rounded-2xl p-6">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-pink-500 rounded-full" />
            Custom Scenario: {customResult.scenarioName}
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <ResultCard label="Portfolio Loss" value={formatCurrency(customResult.portfolioLoss)} color="red" />
            <ResultCard label="Loss %" value={formatPercent(customResult.portfolioLossPercent)} color="red" />
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-gray-400 text-sm mb-3">Asset Breakdown</h4>
            <div className="space-y-2">
              {customResult.assetImpacts.map((impact) => (
                <div key={impact.asset} className="flex items-center justify-between text-sm">
                  <span className="text-white font-mono">{impact.asset}</span>
                  <span className="text-red-400 font-mono">-{formatPercent(impact.lossPercent)} ({formatCurrency(impact.loss)})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {correlationResult && selectedTest === 'correlation' && (
        <div className="bg-gray-900/50 border border-cyan-500/30 rounded-2xl p-6">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-500 rounded-full" />
            Correlation-Adjusted Scenario
          </h3>
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 mb-4">
            <p className="text-cyan-400 text-sm">
              {correlationResult.shockAsset} shock of {formatPercent(correlationResult.shockPercent)} propagated through correlation matrix
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <ResultCard label="Total Impact" value={formatCurrency(correlationResult.totalPortfolioImpact)} color="red" />
            <ResultCard label="Portfolio %" value={formatPercent(correlationResult.totalPortfolioImpactPercent)} color="red" />
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-gray-400 text-sm mb-3">Cascade Effects</h4>
            <div className="space-y-2">
              {correlationResult.cascadeEffects.map((effect) => (
                <div key={effect.asset} className="flex items-center justify-between text-sm">
                  <span className="text-white font-mono">{effect.asset}</span>
                  <div className="text-right">
                    <span className="text-red-400 font-mono">-{formatPercent(effect.expectedImpact)}</span>
                    <span className="text-gray-500 ml-2">({formatCurrency(effect.contribution)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-4">
            Note: Some tokens show stronger correlations with application sectors than their protocol category
          </p>
        </div>
      )}

      {/* Educational Info */}
      <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-white font-semibold text-sm mb-3">About These Stress Tests</h3>
        <div className="space-y-3 text-xs text-gray-400">
          <p>
            <strong className="text-gray-300">Historical VaR:</strong> Uses 250-500 day rolling windows of 7-day/week returns (essential for crypto vs 5-day FX convention). Computes 1st and 5th percentile losses.
          </p>
          <p>
            <strong className="text-gray-300">Monte Carlo VaR:</strong> Simulates 10,000+ paths using GJR-GARCH, which captures crypto&apos;s volatility clustering and fat tails better than simple normal distributions.
          </p>
          <p>
            <strong className="text-gray-300">CVaR/Expected Shortfall:</strong> Averages losses beyond VaR threshold - more informative for crypto&apos;s extreme tail events than VaR alone.
          </p>
          <p>
            <strong className="text-gray-300">Correlation Scenarios:</strong> Shocks propagate through correlation matrix, revealing non-obvious contagion pathways (e.g., Flow correlates more with gaming than its protocol category).
          </p>
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  subValue,
  color = 'gray',
}: {
  label: string;
  value: string;
  subValue?: string;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    red: 'text-red-400',
    orange: 'text-orange-400',
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    cyan: 'text-cyan-400',
    pink: 'text-pink-400',
    gray: 'text-gray-300',
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-3">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${colorClasses[color] || colorClasses.gray}`}>{value}</p>
      {subValue && <p className="text-gray-600 text-xs mt-0.5">{subValue}</p>}
    </div>
  );
}
