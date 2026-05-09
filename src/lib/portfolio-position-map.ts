import type { PortfolioPosition as PortfolioPositionRow } from '@prisma/client';
import type { AssetCategory, ManualPosition } from '@/types/portfolio';

const ASSET_TYPES: AssetCategory[] = ['crypto', 'stock', 'etf', 'bdr', 'fii', 'prediction'];

export function isAssetCategory(v: string): v is AssetCategory {
  return ASSET_TYPES.includes(v as AssetCategory);
}

export function rowToManual(row: PortfolioPositionRow): ManualPosition {
  return {
    id: row.id,
    type: isAssetCategory(row.type) ? row.type : 'stock',
    symbol: row.symbol,
    name: row.name,
    entryDate: row.entryDate.toISOString().slice(0, 10),
    entryPrice: row.entryPrice,
    quantity: row.quantity,
    currentPrice: row.currentPrice ?? undefined,
    side: row.side === 'YES' || row.side === 'NO' ? row.side : undefined,
    market: row.market ?? undefined,
  };
}

export function parseEntryDate(isoDate: string): Date {
  const d = new Date(isoDate.trim());
  if (Number.isNaN(d.getTime())) {
    throw new Error('entryDate inválida');
  }
  return d;
}
