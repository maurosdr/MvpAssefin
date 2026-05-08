export type AssetCategory = 'crypto' | 'stock' | 'etf' | 'bdr' | 'fii' | 'prediction';

export interface ManualPosition {
  id: string;
  type: AssetCategory;
  symbol: string;
  name: string;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  currentPrice?: number;
  // For prediction markets
  side?: 'YES' | 'NO';
  market?: string;
}

export interface PortfolioStats {
  totalValue: number;
  totalReturn: number;
  totalReturnPct: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface PortfolioHistoryPoint {
  date: string;
  value: number;
  returnPct: number;
  drawdown: number;
  volatility: number;
}

export interface PortfolioChartPosition {
  symbol: string;
  name: string;
  type: AssetCategory;
  value: number;
  weight: number;
  returnPct?: number;
  entryDate?: string;
  entryPrice?: number;
  currentPrice?: number;
  quantity?: number;
  side?: 'YES' | 'NO';
}
