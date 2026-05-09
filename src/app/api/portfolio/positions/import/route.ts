import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { rowToManual, parseEntryDate } from '@/lib/portfolio-position-map';
import { createPositionSchema } from '@/lib/portfolio-position-valid';

export const runtime = 'nodejs';

/**
 * Importação única a partir do legado localStorage (array de posições sem id estável).
 * Só cria registros; não apaga existentes.
 */
export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { key: 'portfolio_positions_import_post', limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const schema = z.object({
    positions: z.array(createPositionSchema),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 });
  }

  const userId = session.user.id;
  const items = parsed.data.positions;

  const rows = await prisma.$transaction(
    items.map((d) => {
      const entryDate = parseEntryDate(d.entryDate);
      return prisma.portfolioPosition.create({
        data: {
          userId,
          type: d.type,
          symbol: d.symbol,
          name: d.name,
          entryDate,
          entryPrice: d.entryPrice,
          quantity: d.quantity,
          currentPrice: d.currentPrice ?? null,
          side: d.side ?? null,
          market: d.market ?? null,
        },
      });
    })
  );

  return NextResponse.json({
    imported: rows.length,
    positions: rows.map(rowToManual),
  });
}
