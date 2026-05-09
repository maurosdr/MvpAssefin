import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { portfolioPosition } from '@/lib/prisma-portfolio';
import { rateLimit } from '@/lib/rate-limit';
import { rowToManual, parseEntryDate } from '@/lib/portfolio-position-map';
import { createPositionSchema } from '@/lib/portfolio-position-valid';

export const runtime = 'nodejs';

/** Lista posições manuais do usuário logado. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const rows = await portfolioPosition.findMany({
    where: { userId: session.user.id },
    orderBy: { entryDate: 'desc' },
  });

  return NextResponse.json({ positions: rows.map(rowToManual) });
}

/** Cria uma posição manual. */
export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { key: 'portfolio_positions_post', limit: 60, windowMs: 60_000 });
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

  const parsed = createPositionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 });
  }

  const d = parsed.data;
  let entryDate: Date;
  try {
    entryDate = parseEntryDate(d.entryDate);
  } catch {
    return NextResponse.json({ error: 'Data de entrada inválida' }, { status: 400 });
  }

  const row = await portfolioPosition.create({
    data: {
      userId: session.user.id,
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

  return NextResponse.json({ position: rowToManual(row) }, { status: 201 });
}

const bulkPatchSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().min(1),
      currentPrice: z.number().finite().optional(),
    })
  ),
});

/** Atualização em lote (ex.: preços da cotação). Body: { updates: { id, currentPrice? }[] } */
export async function PATCH(request: NextRequest) {
  const rl = rateLimit(request, { key: 'portfolio_positions_patch', limit: 60, windowMs: 60_000 });
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

  const parsed = bulkPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const { updates } = parsed.data;
  const userId = session.user.id;

  const withPrice = updates.filter((u) => u.currentPrice !== undefined);
  for (const u of withPrice) {
    await portfolioPosition.updateMany({
      where: { id: u.id, userId },
      data: { currentPrice: u.currentPrice },
    });
  }

  const rows = await portfolioPosition.findMany({
    where: { userId },
    orderBy: { entryDate: 'desc' },
  });

  return NextResponse.json({ positions: rows.map(rowToManual) });
}
