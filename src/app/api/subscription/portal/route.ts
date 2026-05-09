import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { getPublicBaseUrl } from '@/lib/public-url';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

type PaymentIntentWithInvoice = {
  invoice?:
    | string
    | null
    | {
        subscription?: string | null | { id: string };
        customer?: string | null | { id: string };
      };
};

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
    select: { id: true, externalId: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (!sub?.externalId) {
    return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada' }, { status: 404 });
  }

  const stripe = getStripe();
  let subscriptionId = sub.externalId;
  let customer: string | null = null;

  // Reparação defensiva: instalações antigas podem ter persistido payment_intent (pi_) em externalId.
  if (subscriptionId.startsWith('pi_')) {
    try {
      const piResp = await stripe.paymentIntents.retrieve(subscriptionId, {
        expand: ['invoice.subscription', 'invoice.customer'],
      });
      const pi = piResp as unknown as PaymentIntentWithInvoice;
      const invoice = typeof pi.invoice === 'string' ? null : pi.invoice;
      const invSub =
        invoice && typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice && invoice.subscription && typeof invoice.subscription !== 'string'
            ? invoice.subscription.id
            : null;
      const invCustomer =
        invoice && typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice && invoice.customer && typeof invoice.customer !== 'string'
            ? invoice.customer.id
            : null;

      if (invSub) {
        subscriptionId = invSub;
        customer = invCustomer;
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { externalId: invSub },
        });
      }
    } catch (e) {
      console.error('Falha ao reparar externalId via payment_intent:', e);
    }
  }

  if (!customer) {
    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
    customer =
      typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id ?? null;
  }
  if (!customer) {
    return NextResponse.json(
      { error: 'Cliente Stripe não encontrado. Tente novamente em alguns minutos.' },
      { status: 500 }
    );
  }

  const baseUrl = getPublicBaseUrl(request);
  const portal = await stripe.billingPortal.sessions.create({
    customer,
    return_url: `${baseUrl}/subscription`,
  });

  return NextResponse.json({ url: portal.url });
}

