import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { getPublicBaseUrl } from '@/lib/public-url';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * Cria uma sessão do Stripe Billing Portal para o usuário.
 * Permite cancelar/gerenciar, evitando que assinantes comprem novamente.
 */
export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { key: 'subscription_portal_post', limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: 'active' },
    select: { externalId: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (!sub?.externalId) {
    return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada' }, { status: 404 });
  }

  const stripe = getStripe();
  const stripeSub = await stripe.subscriptions.retrieve(sub.externalId);
  const customer =
    typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id ?? null;
  if (!customer) {
    return NextResponse.json({ error: 'Cliente Stripe não encontrado' }, { status: 500 });
  }

  const baseUrl = getPublicBaseUrl(request);
  const portal = await stripe.billingPortal.sessions.create({
    customer,
    return_url: `${baseUrl}/subscription`,
  });

  return NextResponse.json({ url: portal.url });
}

