import { NextRequest, NextResponse } from 'next/server';
import { calculateSMA, calculateRSI } from '@/lib/indicators';

export interface BacktestStrategy {
  type: 'backtest_strategy';
  name: string;
  asset: string;
  period: string;
  interval: string;
  indicators: {
    sma_fast?: number;
    sma_slow?: number;
    rsi_period?: number;
    rsi_overbought?: number;
    rsi_oversold?: number;
  };
  entryConditions: string[];
  exitConditions: string[];
  riskManagement: {
    stopLoss: number;
    takeProfit: number;
    positionSize: number;
  };
}

interface OHLCVCandle {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const BRAPI_PERIOD_MAP: Record<string, string> = {
  '3mo': '3mo',
  '6mo': '6mo',
  '1y': '1y',
  '2y': '2y',
  '5y': '5y',
  '1m': '1mo',
  '3m': '3mo',
  '6m': '6mo',
};

const CCXT_TIMEFRAME_MAP: Record<string, { tf: string; limit: number }> = {
  '1h': { tf: '1h', limit: 24 * 30 },
  '4h': { tf: '4h', limit: 6 * 90 },
  '1d': { tf: '1d', limit: 365 },
  '1wk': { tf: '1w', limit: 52 },
};

async function fetchFromBRAPI(asset: string, period: string, interval: string): Promise<OHLCVCandle[]> {
  const token = process.env.BRAPI_TOKEN;
  if (!token) throw new Error('BRAPI_TOKEN not set');

  const range = BRAPI_PERIOD_MAP[period] ?? period;
  const url = `https://brapi.dev/api/v2/crypto?coin=${asset}&currency=USD&range=${range}&interval=${interval}&token=${token}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await fetch(url, { next: { revalidate: 300 } } as any);
  if (!res.ok) throw new Error(`BRAPI error: ${res.status}`);

  const data = await res.json();
  const coinData = data.coins?.[0];
  if (!coinData?.historicalDataPrice?.length) throw new Error('No BRAPI data');

  return coinData.historicalDataPrice.map((c: { date: number; open: number; high: number; low: number; close: number; volume: number }) => ({
    timestamp: c.date * 1000,
    date: new Date(c.date * 1000).toISOString().split('T')[0],
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
}

async function fetchFromCCXT(asset: string, period: string, interval: string): Promise<OHLCVCandle[]> {
  const { default: ccxt } = await import('ccxt');
  const exchange = new ccxt.binance({ enableRateLimit: true });

  const symbol = `${asset}/USDT`;
  const tfConfig = CCXT_TIMEFRAME_MAP[interval] ?? { tf: '1d', limit: 365 };

  const limitMultiplier: Record<string, number> = {
    '3mo': 90, '6mo': 180, '1y': 365, '2y': 730,
    '3m': 90, '6m': 180, '1m': 30,
  };
  const days = limitMultiplier[period] ?? 365;
  const limit = Math.ceil(days * (tfConfig.limit / 365));

  const raw = await exchange.fetchOHLCV(symbol, tfConfig.tf, undefined, Math.min(limit, 1000));
  return raw.map(([ts, open, high, low, close, volume]) => ({
    timestamp: ts as number,
    date: new Date(ts as number).toISOString().split('T')[0],
    open: open as number,
    high: high as number,
    low: low as number,
    close: close as number,
    volume: volume as number,
  }));
}

async function fetchCandles(asset: string, period: string, interval: string): Promise<OHLCVCandle[]> {
  let candles: OHLCVCandle[];
  try {
    candles = await fetchFromBRAPI(asset, period, interval);
  } catch {
    candles = await fetchFromCCXT(asset, period, interval);
  }
  // Ensure ascending chronological order regardless of source
  candles.sort((a, b) => a.timestamp - b.timestamp);
  return candles;
}

interface Trade {
  date: string;
  type: 'buy' | 'sell';
  price: number;
  size: number;
  pnl: number;
}

interface EquityPoint {
  date: string;
  value: number;
}

function runBacktest(candles: OHLCVCandle[], strategy: BacktestStrategy) {
  const closes = candles.map((c) => c.close);
  const { indicators, entryConditions, exitConditions, riskManagement } = strategy;

  const smaFastPeriod = indicators.sma_fast ?? 20;
  const smaSlowPeriod = indicators.sma_slow ?? 50;
  const rsiPeriod = indicators.rsi_period ?? 14;
  const rsiOverbought = indicators.rsi_overbought ?? 70;
  const rsiOversold = indicators.rsi_oversold ?? 30;

  const smaFast = calculateSMA(closes, smaFastPeriod) as (number | null)[];
  const smaSlow = calculateSMA(closes, smaSlowPeriod) as (number | null)[];
  const rsi = calculateRSI(closes, rsiPeriod) as (number | null)[];

  const initialCapital = 10000;
  let cash = initialCapital;
  let position = 0;
  let entryPrice = 0;

  const equity: EquityPoint[] = [];
  const trades: Trade[] = [];
  const winPnls: number[] = [];

  const warmup = Math.max(smaFastPeriod, smaSlowPeriod, rsiPeriod) + 1;

  // Fill the warmup period with flat initialCapital so the equity curve
  // starts from the very first candle of the requested period
  for (let i = 0; i < warmup && i < candles.length; i++) {
    equity.push({ date: candles[i].date, value: initialCapital });
  }

  for (let i = warmup; i < candles.length; i++) {
    const candle = candles[i];
    const price = candle.close;
    const prevSmaFast = smaFast[i - 1];
    const currSmaFast = smaFast[i];
    const prevSmaSlow = smaSlow[i - 1];
    const currSmaSlow = smaSlow[i];
    const currRsi = rsi[i];

    if (
      prevSmaFast === null ||
      currSmaFast === null ||
      prevSmaSlow === null ||
      currSmaSlow === null
    ) {
      equity.push({ date: candle.date, value: cash + position * price });
      continue;
    }

    const smaCrossUp = prevSmaFast <= prevSmaSlow && currSmaFast > currSmaSlow;
    const smaCrossDown = prevSmaFast >= prevSmaSlow && currSmaFast < currSmaSlow;

    // Check exit conditions first
    if (position > 0) {
      let shouldExit = false;

      if (exitConditions.includes('sma_crossover_down') && smaCrossDown) shouldExit = true;
      if (exitConditions.includes('rsi_overbought') && currRsi !== null && currRsi > rsiOverbought) shouldExit = true;

      const stopLossPrice = entryPrice * (1 - riskManagement.stopLoss);
      const takeProfitPrice = entryPrice * (1 + riskManagement.takeProfit);

      if (price <= stopLossPrice) shouldExit = true;
      if (price >= takeProfitPrice) shouldExit = true;

      if (shouldExit) {
        const pnl = (price - entryPrice) * position;
        cash += position * price;
        winPnls.push(pnl);
        trades.push({ date: candle.date, type: 'sell', price, size: position, pnl });
        position = 0;
        entryPrice = 0;
      }
    }

    // Check entry conditions
    if (position === 0) {
      let shouldEnter = true;

      if (entryConditions.includes('sma_crossover_up') && !smaCrossUp) shouldEnter = false;
      if (entryConditions.includes('rsi_oversold') && (currRsi === null || currRsi > rsiOversold)) shouldEnter = false;
      if (entryConditions.includes('rsi_not_overbought') && currRsi !== null && currRsi >= rsiOverbought) shouldEnter = false;

      // If sma_crossover_up not in conditions but rsi conditions are used alone, allow entry on rsi signal
      if (!entryConditions.includes('sma_crossover_up') && shouldEnter) {
        // rsi-only entry: just check rsi conditions (already handled above)
      }

      if (shouldEnter && entryConditions.length > 0) {
        const positionValue = cash * riskManagement.positionSize;
        position = positionValue / price;
        cash -= positionValue;
        entryPrice = price;
        trades.push({ date: candle.date, type: 'buy', price, size: position, pnl: 0 });
      }
    }

    equity.push({ date: candle.date, value: cash + position * price });
  }

  // Close remaining position at last price
  if (position > 0 && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const pnl = (lastCandle.close - entryPrice) * position;
    cash += position * lastCandle.close;
    winPnls.push(pnl);
    trades.push({ date: lastCandle.date, type: 'sell', price: lastCandle.close, size: position, pnl });
    if (equity.length > 0) {
      equity[equity.length - 1].value = cash;
    }
  }

  const finalValue = equity.length > 0 ? equity[equity.length - 1].value : initialCapital;
  const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100;

  const sellTrades = trades.filter((t) => t.type === 'sell');
  const winningTrades = sellTrades.filter((t) => t.pnl > 0);
  const winRate = sellTrades.length > 0 ? (winningTrades.length / sellTrades.length) * 100 : 0;

  // Max drawdown
  let peak = initialCapital;
  let maxDrawdown = 0;
  for (const pt of equity) {
    if (pt.value > peak) peak = pt.value;
    const dd = (peak - pt.value) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Sharpe ratio (daily returns)
  const dailyReturns: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    if (equity[i - 1].value > 0) {
      dailyReturns.push((equity[i].value - equity[i - 1].value) / equity[i - 1].value);
    }
  }
  let sharpeRatio = 0;
  if (dailyReturns.length > 1) {
    const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const stdReturn = Math.sqrt(
      dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / dailyReturns.length
    );
    sharpeRatio = stdReturn > 0 ? (meanReturn / stdReturn) * Math.sqrt(252) : 0;
  }

  return {
    equity,
    trades,
    stats: {
      totalReturn: Math.round(totalReturn * 100) / 100,
      winRate: Math.round(winRate * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      totalTrades: sellTrades.length,
      initialCapital,
      finalCapital: Math.round(finalValue * 100) / 100,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const { strategy } = await req.json() as { strategy: BacktestStrategy };

    if (!strategy || strategy.type !== 'backtest_strategy') {
      return NextResponse.json({ error: 'strategy inválida' }, { status: 400 });
    }

    const asset = strategy.asset.toUpperCase().replace(/\/(USDT|USD|BTC)$/, '');
    const period = strategy.period ?? '1y';
    const interval = strategy.interval ?? '1d';

    const candles = await fetchCandles(asset, period, interval);

    if (candles.length < 60) {
      return NextResponse.json({ error: 'Dados históricos insuficientes' }, { status: 422 });
    }

    const results = runBacktest(candles, strategy);
    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
