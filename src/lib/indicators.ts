import { OHLCV } from '@/types/crypto';

export function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

export function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      result.push(sma);
    } else {
      const prev = result[i - 1]!;
      result.push((data[i] - prev) * multiplier + prev);
    }
  }
  return result;
}

export function calculateRSI(closes: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }

    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);

    if (i < period) {
      result.push(null);
    } else if (i === period) {
      const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    } else {
      const prevRsi = result[i - 1]!;
      const prevAvgGain = (100 / (100 - prevRsi) - 1) > 0 ? gains[gains.length - 2] : 0;
      const currentGain = gains[gains.length - 1];
      const currentLoss = losses[losses.length - 1];
      const avgGain = (prevAvgGain * (period - 1) + currentGain) / period;
      const avgLoss = ((losses.slice(-period - 1, -1).reduce((a, b) => a + b, 0) / period) * (period - 1) + currentLoss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

export function calculateMACD(closes: number[]): {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
} {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);

  const macdLine: (number | null)[] = ema12.map((v, i) => {
    if (v === null || ema26[i] === null) return null;
    return v - ema26[i]!;
  });

  const macdValues = macdLine.filter((v): v is number => v !== null);
  const signalRaw = calculateEMA(macdValues, 9);

  const signal: (number | null)[] = [];
  let j = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] === null) {
      signal.push(null);
    } else {
      signal.push(signalRaw[j] ?? null);
      j++;
    }
  }

  const histogram = macdLine.map((v, i) => {
    if (v === null || signal[i] === null) return null;
    return v - signal[i]!;
  });

  return { macd: macdLine, signal, histogram };
}

export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calculateSMA(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (middle[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = middle[i]!;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const sd = Math.sqrt(variance) * stdDev;
      upper.push(mean + sd);
      lower.push(mean - sd);
    }
  }

  return { upper, middle, lower };
}

export function calculateIchimoku(candles: OHLCV[]): {
  tenkan: (number | null)[];
  kijun: (number | null)[];
  senkouA: (number | null)[];
  senkouB: (number | null)[];
  chikou: (number | null)[];
} {
  const highLow = (data: OHLCV[], period: number, index: number): number | null => {
    if (index < period - 1) return null;
    const slice = data.slice(index - period + 1, index + 1);
    const high = Math.max(...slice.map((c) => c.high));
    const low = Math.min(...slice.map((c) => c.low));
    return (high + low) / 2;
  };

  const tenkan: (number | null)[] = [];
  const kijun: (number | null)[] = [];
  const senkouA: (number | null)[] = [];
  const senkouB: (number | null)[] = [];
  const chikou: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    tenkan.push(highLow(candles, 9, i));
    kijun.push(highLow(candles, 26, i));

    const t = tenkan[i];
    const k = kijun[i];
    senkouA.push(t !== null && k !== null ? (t + k) / 2 : null);
    senkouB.push(highLow(candles, 52, i));
    chikou.push(i >= 26 ? candles[i].close : null);
  }

  return { tenkan, kijun, senkouA, senkouB, chikou };
}

export function calculateVolatility(closes: number[], period: number = 30): number {
  if (closes.length < period + 1) return 0;
  const recent = closes.slice(-period - 1);
  const returns: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    returns.push(Math.log(recent[i] / recent[i - 1]));
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance * 365) * 100;
}
