import { PortfolioHistoryPoint } from '@/types/portfolio';

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
