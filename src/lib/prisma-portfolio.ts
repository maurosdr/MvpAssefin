import { prisma } from '@/lib/prisma';

/** Delegate gerado pelo Prisma; use um único cast para quando o tipo de `PrismaClient` atrasa em relação ao `prisma generate`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const portfolioPosition = (prisma as any).portfolioPosition;
