export interface PortfolioAsset {
  symbol: string;
  name: string;
  type: 'crypto' | 'stock' | 'fixed-income' | 'etf';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  allocation: number; // percentage
  pnl: number;
  pnlPercent: number;
}

export interface PortfolioSnapshot {
  date: string;
  totalValue: number;
}

export interface PortfolioRiskMetrics {
  totalValue: number;
  dailyReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  beta: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  assetCount: number;
  assets: PortfolioAsset[];
  riskMetrics: PortfolioRiskMetrics;
  history: PortfolioSnapshot[];
  allocation: { type: string; value: number; percentage: number }[];
}
