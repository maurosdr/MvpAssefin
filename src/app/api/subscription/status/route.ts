import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const active = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: 'active' },
    select: {
      id: true,
      planId: true,
      planName: true,
      status: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: true,
      externalId: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({
    hasActive: Boolean(active),
    subscription: active
      ? {
          id: active.id,
          planId: active.planId,
          planName: active.planName,
          status: active.status,
          cancelAtPeriodEnd: active.cancelAtPeriodEnd,
          currentPeriodEnd: active.currentPeriodEnd,
          hasExternalId: Boolean(active.externalId),
        }
      : null,
  });
}

