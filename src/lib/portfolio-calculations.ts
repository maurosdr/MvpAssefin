import { PortfolioHistoryPoint } from '@/types/portfolio';

// ─── Advanced Analytics ──────────────────────────────────────────────────────

export interface EfficientFrontierPoint {
  risk: number;
  annReturn: number;
  sharpe: number;
  isCurrent?: boolean;
  isMaxSharpe?: boolean;
  weights?: Record<string, number>;
}

export interface BrinsonItem {
  symbol: string;
  allocationEffect: number;
  selectionEffect: number;
  total: number;
}

export interface WaterfallItem {
  name: string;
  value: number;
  start: number;
  isTotal?: boolean;
}

export interface CorrelationResult {
  labels: string[];
  matrix: number[][];
}

/**
 * Pearson correlation between two return series (uses min-length overlap)
 */
export function calculatePearsonCorrelation(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len < 2) return 0;
  const ax = a.slice(0, len);
  const bx = b.slice(0, len);
  const meanA = ax.reduce((s, v) => s + v, 0) / len;
  const meanB = bx.reduce((s, v) => s + v, 0) / len;
  let cov = 0, stdA = 0, stdB = 0;
  for (let i = 0; i < len; i++) {
    cov += (ax[i] - meanA) * (bx[i] - meanB);
    stdA += (ax[i] - meanA) ** 2;
    stdB += (bx[i] - meanB) ** 2;
  }
  const denom = Math.sqrt(stdA * stdB);
  return denom === 0 ? 0 : cov / denom;
}

/**
 * Portfolio-wide correlation: weighted average of all pairwise correlations.
 * weights[i] corresponds to symbols[i] weight (already normalized or not — we normalize internally).
 * Returns a value in [-1, 1]. Also returns qualitative label and diversification score.
 */
export function calculatePortfolioCorrelation(
  matrix: number[][],
  weights: number[]
): { value: number; label: string; diversification: number } {
  const n = matrix.length;
  if (n < 2) return { value: 0, label: 'N/A', diversification: 1 };

  const wTotal = weights.reduce((a, b) => a + b, 0) || 1;
  const w = weights.map((x) => x / wTotal);

  // Weighted average pairwise correlation: Σ(wi*wj*ρij) / Σ(wi*wj) for i≠j
  let sumWC = 0;
  let sumW = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const ww = w[i] * w[j];
        sumWC += ww * (matrix[i]?.[j] ?? 0);
        sumW += ww;
      }
    }
  }
  const value = sumW > 0 ? sumWC / sumW : 0;

  // Effective number of assets (Markowitz diversification): 1 / Σ(wi²) — compared to corr-adjusted
  const hhi = w.reduce((s, wi) => s + wi * wi, 0);
  const effectiveN = hhi > 0 ? 1 / hhi : n;
  const diversification = Math.min(1, effectiveN / n);

  let label: string;
  if (value < 0.2) label = 'Baixa — carteira bem diversificada';
  else if (value < 0.5) label = 'Moderada — diversificação razoável';
  else if (value < 0.75) label = 'Alta — ativos andam juntos';
  else label = 'Muito Alta — pouca diversificação';

  return { value, label, diversification };
}

/**
 * Build an NxN Pearson correlation matrix from daily return series
 */
export function calculateCorrelationMatrix(
  symbols: string[],
  returnSeries: Record<string, number[]>
): CorrelationResult {
  const n = symbols.length;
  const matrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => {
      if (i === j) return 1;
      const a = returnSeries[symbols[i]] ?? [];
      const b = returnSeries[symbols[j]] ?? [];
      return calculatePearsonCorrelation(a, b);
    })
  );
  return { labels: symbols, matrix };
}

/**
 * Monte Carlo simulation: generate random portfolios and return the efficient frontier cloud.
 * Also returns the current portfolio as a special point.
 * annualRiskFreeRate default: 13.75% (SELIC)
 */
export function generateEfficientFrontier(
  symbols: string[],
  returnSeries: Record<string, number[]>,
  currentWeights: Record<string, number>,
  nSimulations = 500,
  annualRiskFreeRate = 0.1375
): EfficientFrontierPoint[] {
  const n = symbols.length;
  if (n < 2) return [];

  const returns = symbols.map((s) => returnSeries[s] ?? []);
  const minLen = Math.min(...returns.map((r) => r.length));
  if (minLen < 20) return [];

  const aligned = returns.map((r) => r.slice(0, minLen));

  const portfolioStats = (weights: number[]): { risk: number; annReturn: number; sharpe: number } => {
    // Weighted portfolio daily returns
    const portReturns: number[] = [];
    for (let t = 0; t < minLen; t++) {
      let pr = 0;
      for (let i = 0; i < n; i++) pr += weights[i] * (aligned[i][t] ?? 0);
      portReturns.push(pr);
    }
    const mean = portReturns.reduce((s, v) => s + v, 0) / portReturns.length;
    const annReturn = mean * 252 * 100;
    const variance =
      portReturns.reduce((s, v) => s + (v - mean) ** 2, 0) / (portReturns.length - 1);
    const risk = Math.sqrt(variance * 252) * 100;
    const sharpe = risk === 0 ? 0 : (annReturn - annualRiskFreeRate * 100) / risk;
    return { risk, annReturn, sharpe };
  };

  const points: EfficientFrontierPoint[] = [];

  // Monte Carlo simulations
  for (let sim = 0; sim < nSimulations; sim++) {
    const rawWeights = symbols.map(() => Math.random());
    const sum = rawWeights.reduce((a, b) => a + b, 0);
    const weights = rawWeights.map((w) => w / sum);
    const weightsMap: Record<string, number> = {};
    symbols.forEach((sym, i) => { weightsMap[sym] = weights[i]; });
    points.push({ ...portfolioStats(weights), weights: weightsMap });
  }

  // Current portfolio point
  const cwTotal = symbols.reduce((s, sym) => s + (currentWeights[sym] ?? 0), 0) || 1;
  const cwNorm = symbols.map((sym) => (currentWeights[sym] ?? 0) / cwTotal);
  const cwMap: Record<string, number> = {};
  symbols.forEach((sym, i) => { cwMap[sym] = cwNorm[i]; });
  const currentStats = portfolioStats(cwNorm);
  points.push({ ...currentStats, isCurrent: true, weights: cwMap });

  // Mark max Sharpe point among simulations
  let maxSharpeIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    if (points[i].sharpe > points[maxSharpeIdx].sharpe) maxSharpeIdx = i;
  }
  points[maxSharpeIdx] = { ...points[maxSharpeIdx], isMaxSharpe: true };

  return points;
}

/**
 * Simplified Brinson attribution using equal-weight benchmark.
 * Returns allocation effect, selection effect, and total contribution per asset.
 */
export function calculateBrinsonAttribution(
  symbols: string[],
  portfolioWeights: Record<string, number>,
  returnSeries: Record<string, number[]>
): BrinsonItem[] {
  const n = symbols.length;
  if (n === 0) return [];

  const wBench = 1 / n;
  // Total return per asset over the period
  const totalReturns: Record<string, number> = {};
  for (const sym of symbols) {
    const r = returnSeries[sym] ?? [];
    totalReturns[sym] = r.length > 0 ? r.reduce((s, v) => s + v, 0) * 100 : 0;
  }

  // Equal-weight benchmark total return
  const rBench = symbols.reduce((s, sym) => s + totalReturns[sym], 0) / n;

  const wTotal = symbols.reduce((s, sym) => s + (portfolioWeights[sym] ?? 0), 0) || 1;

  return symbols.map((sym) => {
    const wPort = (portfolioWeights[sym] ?? 0) / wTotal;
    const ri = totalReturns[sym];
    const allocationEffect = (wPort - wBench) * (ri - rBench);
    const selectionEffect = wBench * (ri - rBench);
    const total = wPort * ri;
    return {
      symbol: sym,
      allocationEffect: parseFloat(allocationEffect.toFixed(4)),
      selectionEffect: parseFloat(selectionEffect.toFixed(4)),
      total: parseFloat(total.toFixed(4)),
    };
  });
}

/**
 * Return contributions per asset for waterfall chart.
 * contribution_i = weight_i * total_return_i
 * Sorted descending, with cumulative start for floating bars.
 * Appends a "Total" bar at the end.
 */
export function calculateReturnContributions(
  symbols: string[],
  portfolioWeights: Record<string, number>,
  returnSeries: Record<string, number[]>
): WaterfallItem[] {
  if (symbols.length === 0) return [];

  const wTotal = symbols.reduce((s, sym) => s + (portfolioWeights[sym] ?? 0), 0) || 1;

  const contributions = symbols.map((sym) => {
    const w = (portfolioWeights[sym] ?? 0) / wTotal;
    const r = returnSeries[sym] ?? [];
    const totalReturn = r.length > 0 ? r.reduce((s, v) => s + v, 0) * 100 : 0;
    return { name: sym, value: parseFloat((w * totalReturn).toFixed(4)) };
  });

  // Sort descending by contribution
  contributions.sort((a, b) => b.value - a.value);

  // Build waterfall: start = cumulative of previous values
  const items: WaterfallItem[] = [];
  let cumulative = 0;
  for (const c of contributions) {
    items.push({ name: c.name, value: c.value, start: cumulative });
    cumulative += c.value;
  }

  // Total bar
  items.push({ name: 'Total', value: cumulative, start: 0, isTotal: true });

  return items;
}

export interface DailyPrice {
  date: string;
  close: number;
}

/**
 * Calculate daily log returns from a price series
 */
export function calculateDailyReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
  }
  return returns;
}

/**
 * Calculate simple returns from a price series
 */
export function calculateSimpleReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }
  return returns;
}

/**
 * Calculate annualized volatility from daily returns
 */
export function calculatePortfolioVolatility(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
    (dailyReturns.length - 1);
  return Math.sqrt(variance * 252) * 100; // annualized %
}

/**
 * Calculate Sharpe Ratio (annualized)
 * Default risk-free rate: ~13.75% (SELIC)
 */
export function calculateSharpeRatio(
  dailyReturns: number[],
  annualRiskFreeRate: number = 0.1375
): number {
  if (dailyReturns.length < 2) return 0;
  const dailyRf = Math.pow(1 + annualRiskFreeRate, 1 / 252) - 1;
  const excessReturns = dailyReturns.map((r) => r - dailyRf);
  const mean = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const std = Math.sqrt(
    excessReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      (excessReturns.length - 1)
  );
  return std === 0 ? 0 : (mean / std) * Math.sqrt(252);
}

/**
 * Calculate maximum drawdown from a value series
 */
export function calculateMaxDrawdown(values: number[]): number {
  if (values.length < 2) return 0;
  let maxDD = 0;
  let peak = values[0];
  for (const value of values) {
    if (value > peak) peak = value;
    if (peak > 0) {
      const dd = (peak - value) / peak;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return maxDD * 100; // percentage
}

/**
 * Calculate cumulative return percentage from a price series
 */
export function calculateCumulativeReturn(prices: number[]): number {
  if (prices.length < 2 || prices[0] === 0) return 0;
  return ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
}

/**
 * Calculate rolling volatility (annualized) over a window
 */
export function calculateRollingVolatility(
  dailyReturns: number[],
  window: number = 20
): number[] {
  const result: number[] = [];
  for (let i = 0; i < dailyReturns.length; i++) {
    if (i < window - 1) {
      result.push(0);
    } else {
      const slice = dailyReturns.slice(i - window + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
      const variance =
        slice.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (slice.length - 1);
      result.push(Math.sqrt(variance * 252) * 100);
    }
  }
  return result;
}

/**
 * Calculate drawdown series from a value series
 */
export function calculateDrawdownSeries(values: number[]): number[] {
  const drawdowns: number[] = [];
  let peak = values[0] || 0;
  for (const value of values) {
    if (value > peak) peak = value;
    drawdowns.push(peak > 0 ? -((peak - value) / peak) * 100 : 0);
  }
  return drawdowns;
}

/**
 * Build portfolio history from aligned price series with weights
 */
export function buildPortfolioHistory(
  dates: string[],
  positionSeries: { symbol: string; prices: number[]; weight: number }[]
): PortfolioHistoryPoint[] {
  if (dates.length === 0 || positionSeries.length === 0) return [];

  const portfolioValues: number[] = [];

  for (let i = 0; i < dates.length; i++) {
    let value = 0;
    for (const pos of positionSeries) {
      if (pos.prices[i] !== undefined && pos.prices[0] > 0) {
        // Normalized: start at weight, then grow/shrink with price
        value += pos.weight * (pos.prices[i] / pos.prices[0]);
      }
    }
    portfolioValues.push(value);
  }

  const initialValue = portfolioValues[0] || 1;
  const dailyReturns = calculateDailyReturns(portfolioValues);
  const rollingVol = calculateRollingVolatility(dailyReturns);
  const drawdowns = calculateDrawdownSeries(portfolioValues);

  return dates.map((date, i) => ({
    date,
    value: portfolioValues[i],
    returnPct: ((portfolioValues[i] - initialValue) / initialValue) * 100,
    drawdown: drawdowns[i],
    volatility: i > 0 ? rollingVol[i - 1] || 0 : 0,
  }));
}

// ─── Black-Litterman ─────────────────────────────────────────────────────────

export interface BlackLittermanAllocation {
  /** BL-optimal portfolio weights (max BL-Sharpe via Monte Carlo) */
  bl: Record<string, number>;
  /** Markowitz max-Sharpe weights (extracted from efficient frontier) */
  maxSharpe: Record<string, number>;
  /** Current portfolio weights (normalized) */
  current: Record<string, number>;
}

/**
 * Simplified Black-Litterman allocation without external views.
 *
 * Uses the average of implied equilibrium returns (CAPM with equal-weight market)
 * and historical mean returns as the BL posterior — equivalent to the P=I, Ω=τΣ
 * closed-form solution with τ=1. Then finds the max-BL-Sharpe portfolio via Monte
 * Carlo and returns all three allocations (BL optimal, Markowitz max Sharpe, current).
 */
export function generateBlackLittermanAllocation(
  symbols: string[],
  returnSeries: Record<string, number[]>,
  currentWeights: Record<string, number>,
  frontier: EfficientFrontierPoint[],
  delta = 2.5,
  annualRiskFreeRate = 0.1375,
  nSimulations = 500
): BlackLittermanAllocation | null {
  const n = symbols.length;
  if (n < 2) return null;

  const seriesArrays = symbols.map((s) => returnSeries[s] ?? []);
  const minLen = Math.min(...seriesArrays.map((s) => s.length));
  if (minLen < 20) return null;

  const aligned = seriesArrays.map((s) => s.slice(0, minLen));

  // Daily means
  const means = aligned.map((s) => s.reduce((a, b) => a + b, 0) / minLen);

  // Daily covariance matrix
  const cov: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let s = 0;
      for (let t = 0; t < minLen; t++) {
        s += (aligned[i][t] - means[i]) * (aligned[j][t] - means[j]);
      }
      return s / (minLen - 1);
    })
  );

  // Equal market weights → implied equilibrium returns (annualized fraction)
  const wMkt = Array(n).fill(1 / n);
  const pi = Array.from({ length: n }, (_, i) =>
    delta * wMkt.reduce((s, wj, j) => s + wj * cov[i][j], 0) * 252
  );

  // Historical mean returns annualized
  const muAnn = means.map((m) => m * 252);

  // BL posterior: average of equilibrium and historical
  const blReturns = pi.map((p, i) => (p + muAnn[i]) / 2);

  // Portfolio BL-Sharpe given weights
  const portBlSharpe = (weights: number[]): number => {
    const blRet = weights.reduce((s, w, i) => s + w * blReturns[i], 0) * 100;
    let variance = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        variance += weights[i] * weights[j] * cov[i][j] * 252;
      }
    }
    const risk = Math.sqrt(variance) * 100;
    return risk > 0 ? (blRet - annualRiskFreeRate * 100) / risk : 0;
  };

  // Monte Carlo to find max BL-Sharpe portfolio
  let bestSharpe = -Infinity;
  let bestWeights: number[] = wMkt;
  for (let sim = 0; sim < nSimulations; sim++) {
    const raw = Array.from({ length: n }, () => Math.random());
    const sum = raw.reduce((a, b) => a + b, 0);
    const w = raw.map((v) => v / sum);
    const sh = portBlSharpe(w);
    if (sh > bestSharpe) {
      bestSharpe = sh;
      bestWeights = w;
    }
  }

  // BL optimal allocation
  const blMap: Record<string, number> = {};
  symbols.forEach((sym, i) => { blMap[sym] = bestWeights[i]; });

  // Markowitz max-Sharpe weights from frontier
  const maxSharpePoint = frontier.find((p) => p.isMaxSharpe);
  const maxSharpeMap: Record<string, number> = maxSharpePoint?.weights ?? {};

  // Current weights normalized
  const cwTotal = symbols.reduce((s, sym) => s + (currentWeights[sym] ?? 0), 0) || 1;
  const currentMap: Record<string, number> = {};
  symbols.forEach((sym) => { currentMap[sym] = (currentWeights[sym] ?? 0) / cwTotal; });

  return { bl: blMap, maxSharpe: maxSharpeMap, current: currentMap };
}
