export interface CryptoTicker {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  marketCap?: number;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CryptoDetail {
  symbol: string;
  name: string;
  price: number;
  volume24h: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  ma20: number;
  volatility30d: number;
  rsi14: number;
  mvrv?: number;
}

export interface BinancePosition {
  asset: string;
  free: number;
  locked: number;
  total: number;
  usdValue: number;
  exchange?: string;
}

export interface BookEntry {
  asset: string;
  totalAmount: number;
  totalUsdValue: number;
  exchanges: {
    exchange: string;
    free: number;
    locked: number;
    total: number;
    usdValue: number;
  }[];
}

export interface BinanceKeys {
  apiKey: string;
  secret: string;
}

export interface FearGreedData {
  value: number;
  classification: string;
  timestamp: string;
}

export interface KalshiEvent {
  title: string;
  yes_price: number;
  no_price: number;
  volume: number;
}

export type TimeWindow = '1d' | '1w' | '1m' | '3m' | '6m' | '1y';

export type TechnicalIndicator = 'ma' | 'ema' | 'ichimoku' | 'macd' | 'bollinger';
