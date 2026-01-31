/**
 * Risk Management Calculations
 * - Historical VaR
 * - Monte Carlo VaR (GJR-GARCH simulation)
 * - CVaR / Expected Shortfall
 * - Custom Scenarios
 * - Correlation-adjusted Scenarios
 */

// Percentile calculation
function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (upper >= sorted.length) return sorted[sorted.length - 1];
  if (lower < 0) return sorted[0];

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// Calculate daily returns from price series
export function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

// Standard deviation
function stdDev(arr: number[]): number {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const squaredDiffs = arr.map((x) => Math.pow(x - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length);
}

// Mean
function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Normal distribution inverse (approximation for VaR)
function normInv(p: number): number {
  // Approximation of inverse normal CDF
  const a1 = -3.969683028665376e1;
  const a2 = 2.209460984245205e2;
  const a3 = -2.759285104469687e2;
  const a4 = 1.383577518672690e2;
  const a5 = -3.066479806614716e1;
  const a6 = 2.506628277459239e0;

  const b1 = -5.447609879822406e1;
  const b2 = 1.615858368580409e2;
  const b3 = -1.556989798598866e2;
  const b4 = 6.680131188771972e1;
  const b5 = -1.328068155288572e1;

  const c1 = -7.784894002430293e-3;
  const c2 = -3.223964580411365e-1;
  const c3 = -2.400758277161838e0;
  const c4 = -2.549732539343734e0;
  const c5 = 4.374664141464968e0;
  const c6 = 2.938163982698783e0;

  const d1 = 7.784695709041462e-3;
  const d2 = 3.224671290700398e-1;
  const d3 = 2.445134137142996e0;
  const d4 = 3.754408661907416e0;

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;
  let r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    );
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q) /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    );
  }
}

export interface HistoricalVaRParams {
  returns: number[];
  windowSize: number; // 250-500 days
  confidenceLevels: number[]; // e.g., [0.01, 0.05] for 1% and 5%
  portfolioValue: number;
}

export interface HistoricalVaRResult {
  var1Pct: number;
  var5Pct: number;
  var1PctDollar: number;
  var5PctDollar: number;
  windowUsed: number;
  dataPoints: number;
}

export function calculateHistoricalVaR(params: HistoricalVaRParams): HistoricalVaRResult {
  const { returns, windowSize, portfolioValue } = params;

  // Use the most recent window
  const windowReturns = returns.slice(-windowSize);

  // Calculate VaR at different confidence levels
  const var1Pct = percentile(windowReturns, 1);
  const var5Pct = percentile(windowReturns, 5);

  return {
    var1Pct: Math.abs(var1Pct) * 100,
    var5Pct: Math.abs(var5Pct) * 100,
    var1PctDollar: Math.abs(var1Pct) * portfolioValue,
    var5PctDollar: Math.abs(var5Pct) * portfolioValue,
    windowUsed: windowReturns.length,
    dataPoints: returns.length,
  };
}

export interface MonteCarloVaRParams {
  returns: number[];
  numSimulations: number; // 10,000+
  timeHorizon: number; // days
  portfolioValue: number;
}

export interface MonteCarloVaRResult {
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

// Simplified GJR-GARCH volatility estimation
function estimateGARCHVolatility(returns: number[]): { omega: number; alpha: number; beta: number; gamma: number } {
  // Simplified parameter estimation for GJR-GARCH(1,1)
  const variance = Math.pow(stdDev(returns), 2);

  // Typical GARCH parameters for crypto (high persistence, leverage effect)
  return {
    omega: variance * 0.05,
    alpha: 0.05,
    beta: 0.90,
    gamma: 0.05, // Asymmetric effect for negative returns
  };
}

export function calculateMonteCarloVaR(params: MonteCarloVaRParams): MonteCarloVaRResult {
  const { returns, numSimulations, timeHorizon, portfolioValue } = params;

  const mu = mean(returns);
  const sigma = stdDev(returns);
  const garchParams = estimateGARCHVolatility(returns);

  const simulatedReturns: number[] = [];

  // Run simulations
  for (let sim = 0; sim < numSimulations; sim++) {
    let cumReturn = 0;
    let ht = Math.pow(sigma, 2); // Initial variance

    for (let t = 0; t < timeHorizon; t++) {
      // Generate random shock
      const z = normInv(Math.random());
      const epsilon = z * Math.sqrt(ht);

      // Daily return
      const dailyReturn = mu + epsilon;
      cumReturn += dailyReturn;

      // Update variance using GJR-GARCH
      const indicator = epsilon < 0 ? 1 : 0;
      ht =
        garchParams.omega +
        garchParams.alpha * Math.pow(epsilon, 2) +
        garchParams.gamma * indicator * Math.pow(epsilon, 2) +
        garchParams.beta * ht;
    }

    simulatedReturns.push(cumReturn);
  }

  // Calculate VaR from simulated distribution
  const var1Pct = percentile(simulatedReturns, 1);
  const var5Pct = percentile(simulatedReturns, 5);
  const worstCase = Math.min(...simulatedReturns);
  const bestCase = Math.max(...simulatedReturns);

  return {
    var1Pct: Math.abs(var1Pct) * 100,
    var5Pct: Math.abs(var5Pct) * 100,
    var1PctDollar: Math.abs(var1Pct) * portfolioValue,
    var5PctDollar: Math.abs(var5Pct) * portfolioValue,
    expectedReturn: mean(simulatedReturns) * 100,
    volatility: stdDev(simulatedReturns) * 100,
    simulationsRun: numSimulations,
    worstCase: worstCase * 100,
    bestCase: bestCase * 100,
  };
}

export interface CVaRParams {
  returns: number[];
  confidenceLevel: number; // e.g., 0.05 for 5%
  portfolioValue: number;
}

export interface CVaRResult {
  var: number;
  cvar: number;
  varDollar: number;
  cvarDollar: number;
  tailRiskMultiple: number;
}

export function calculateCVaR(params: CVaRParams): CVaRResult {
  const { returns, confidenceLevel, portfolioValue } = params;

  const varLevel = percentile(returns, confidenceLevel * 100);

  // CVaR is the average of all losses beyond VaR
  const tailLosses = returns.filter((r) => r <= varLevel);
  const cvarLevel = tailLosses.length > 0 ? mean(tailLosses) : varLevel;

  return {
    var: Math.abs(varLevel) * 100,
    cvar: Math.abs(cvarLevel) * 100,
    varDollar: Math.abs(varLevel) * portfolioValue,
    cvarDollar: Math.abs(cvarLevel) * portfolioValue,
    tailRiskMultiple: Math.abs(cvarLevel / varLevel),
  };
}

export interface CustomScenario {
  name: string;
  shocks: { asset: string; shock: number }[]; // shock as percentage (e.g., -40 for -40%)
}

export interface CustomScenarioResult {
  scenarioName: string;
  portfolioLoss: number;
  portfolioLossPercent: number;
  assetImpacts: { asset: string; loss: number; lossPercent: number }[];
}

export interface Portfolio {
  positions: { asset: string; value: number }[];
}

export function calculateCustomScenario(
  portfolio: Portfolio,
  scenario: CustomScenario
): CustomScenarioResult {
  const assetImpacts: { asset: string; loss: number; lossPercent: number }[] = [];
  let totalLoss = 0;
  let totalValue = 0;

  for (const position of portfolio.positions) {
    totalValue += position.value;
    const shock = scenario.shocks.find((s) => s.asset === position.asset);
    if (shock) {
      const loss = position.value * (shock.shock / 100);
      totalLoss += loss;
      assetImpacts.push({
        asset: position.asset,
        loss: Math.abs(loss),
        lossPercent: Math.abs(shock.shock),
      });
    } else {
      assetImpacts.push({
        asset: position.asset,
        loss: 0,
        lossPercent: 0,
      });
    }
  }

  return {
    scenarioName: scenario.name,
    portfolioLoss: Math.abs(totalLoss),
    portfolioLossPercent: totalValue > 0 ? (Math.abs(totalLoss) / totalValue) * 100 : 0,
    assetImpacts,
  };
}

export interface CorrelationMatrix {
  assets: string[];
  matrix: number[][]; // Correlation coefficients
}

export interface CorrelationScenarioParams {
  portfolio: Portfolio;
  shockAsset: string;
  shockPercent: number;
  correlations: CorrelationMatrix;
}

export interface CorrelationScenarioResult {
  shockAsset: string;
  shockPercent: number;
  cascadeEffects: { asset: string; expectedImpact: number; contribution: number }[];
  totalPortfolioImpact: number;
  totalPortfolioImpactPercent: number;
}

export function calculateCorrelationScenario(
  params: CorrelationScenarioParams
): CorrelationScenarioResult {
  const { portfolio, shockAsset, shockPercent, correlations } = params;

  const shockAssetIndex = correlations.assets.indexOf(shockAsset);
  if (shockAssetIndex === -1) {
    return {
      shockAsset,
      shockPercent,
      cascadeEffects: [],
      totalPortfolioImpact: 0,
      totalPortfolioImpactPercent: 0,
    };
  }

  const cascadeEffects: { asset: string; expectedImpact: number; contribution: number }[] = [];
  let totalImpact = 0;
  let totalValue = 0;

  for (const position of portfolio.positions) {
    totalValue += position.value;
    const assetIndex = correlations.assets.indexOf(position.asset);

    if (assetIndex === -1) {
      cascadeEffects.push({
        asset: position.asset,
        expectedImpact: 0,
        contribution: 0,
      });
      continue;
    }

    // Get correlation with the shocked asset
    const correlation = correlations.matrix[shockAssetIndex][assetIndex];

    // Estimate impact based on correlation and shock
    // Impact = correlation * shock * volatility_ratio (simplified to correlation * shock)
    const expectedImpact = position.asset === shockAsset ? shockPercent : correlation * shockPercent * 0.8;

    const lossAmount = position.value * (expectedImpact / 100);
    totalImpact += Math.abs(lossAmount);

    cascadeEffects.push({
      asset: position.asset,
      expectedImpact: Math.abs(expectedImpact),
      contribution: Math.abs(lossAmount),
    });
  }

  return {
    shockAsset,
    shockPercent: Math.abs(shockPercent),
    cascadeEffects,
    totalPortfolioImpact: totalImpact,
    totalPortfolioImpactPercent: totalValue > 0 ? (totalImpact / totalValue) * 100 : 0,
  };
}

// Default correlation matrix for common crypto assets
export function getDefaultCryptoCorrelations(): CorrelationMatrix {
  const assets = ['BTC', 'ETH', 'SOL', 'DOGE', 'ADA', 'XRP', 'LINK', 'UNI', 'USDT', 'USDC'];

  // Simplified correlation matrix (symmetric)
  const matrix: number[][] = [
    [1.0, 0.85, 0.78, 0.65, 0.72, 0.68, 0.75, 0.70, 0.05, 0.05], // BTC
    [0.85, 1.0, 0.82, 0.60, 0.75, 0.65, 0.80, 0.78, 0.05, 0.05], // ETH
    [0.78, 0.82, 1.0, 0.55, 0.70, 0.60, 0.72, 0.68, 0.05, 0.05], // SOL
    [0.65, 0.60, 0.55, 1.0, 0.50, 0.55, 0.45, 0.42, 0.05, 0.05], // DOGE
    [0.72, 0.75, 0.70, 0.50, 1.0, 0.65, 0.60, 0.55, 0.05, 0.05], // ADA
    [0.68, 0.65, 0.60, 0.55, 0.65, 1.0, 0.58, 0.52, 0.05, 0.05], // XRP
    [0.75, 0.80, 0.72, 0.45, 0.60, 0.58, 1.0, 0.72, 0.05, 0.05], // LINK
    [0.70, 0.78, 0.68, 0.42, 0.55, 0.52, 0.72, 1.0, 0.05, 0.05], // UNI
    [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 1.0, 0.98], // USDT
    [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.98, 1.0], // USDC
  ];

  return { assets, matrix };
}
