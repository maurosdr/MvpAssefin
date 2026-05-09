import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { rowToManual, parseEntryDate } from '@/lib/portfolio-position-map';
import { patchPositionSchema } from '@/lib/portfolio-position-valid';

export const runtime = 'nodejs';

type RouteCtx = { params: { id: string } };

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  const rl = rateLimit(request, { key: 'portfolio_position_id_patch', limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = patchPositionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 });
  }

  const data = parsed.data;
  const existing = await prisma.portfolioPosition.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Posição não encontrada' }, { status: 404 });
  }

  let entryDate: Date | undefined;
  if (data.entryDate !== undefined) {
    try {
      entryDate = parseEntryDate(data.entryDate);
    } catch {
      return NextResponse.json({ error: 'Data de entrada inválida' }, { status: 400 });
    }
  }

  const row = await prisma.portfolioPosition.update({
    where: { id },
    data: {
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.symbol !== undefined ? { symbol: data.symbol } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(entryDate !== undefined ? { entryDate } : {}),
      ...(data.entryPrice !== undefined ? { entryPrice: data.entryPrice } : {}),
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.currentPrice !== undefined ? { currentPrice: data.currentPrice } : {}),
      ...(data.side !== undefined ? { side: data.side } : {}),
      ...(data.market !== undefined ? { market: data.market } : {}),
    },
  });

  return NextResponse.json({ position: rowToManual(row) });
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  const rl = rateLimit(request, { key: 'portfolio_position_id_delete', limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = ctx.params;

  const deleted = await prisma.portfolioPosition.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Posição não encontrada' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
