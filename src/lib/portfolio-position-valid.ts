import { z } from 'zod';

export const assetCategorySchema = z.enum(['crypto', 'stock', 'etf', 'bdr', 'fii', 'prediction']);

/** Corpo para criar posição (sem id). */
export const createPositionSchema = z.object({
  type: assetCategorySchema,
  symbol: z.string().min(1).max(64),
  name: z.string().min(1).max(512),
  entryDate: z.string().min(8).max(32),
  entryPrice: z.number().finite(),
  quantity: z.number().positive().finite(),
  currentPrice: z.number().finite().optional(),
  side: z.enum(['YES', 'NO']).optional(),
  market: z.string().max(512).optional(),
});

export const patchPositionSchema = createPositionSchema.partial();

export type CreatePositionInput = z.infer<typeof createPositionSchema>;
