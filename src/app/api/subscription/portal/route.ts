import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
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
  customer?: string | null | { id: string };
};

function subscriptionIdFromStripeRef(
  ref: string | { id: string } | null | undefined
): string | null {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref.id ?? null;
}

function customerIdFromStripeRef(
  ref: string | { id: string } | null | undefined
): string | null {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref.id ?? null;
}

/**
 * Descobre sub_ e customer a partir de um PaymentIntent (inclui fatura só como ID e cobranças off-session).
 */
async function resolveSubscriptionFromPaymentIntent(
  stripe: Stripe,
  piId: string
): Promise<{ subscriptionId: string; customerId: string } | null> {
  const piResp = await stripe.paymentIntents.retrieve(piId, {
    expand: ['invoice.subscription', 'invoice.customer', 'customer'],
  });
  const pi = piResp as unknown as PaymentIntentWithInvoice;

  let invoiceLike:
    | {
        subscription?: string | null | { id: string };
        customer?: string | null | { id: string };
      }
    | null = null;

  if (typeof pi.invoice === 'string') {
    const inv = await stripe.invoices.retrieve(pi.invoice, {
      expand: ['subscription', 'customer'],
    });
    invoiceLike = inv as unknown as typeof invoiceLike;
  } else if (pi.invoice && typeof pi.invoice !== 'string') {
    invoiceLike = pi.invoice;
  }

  const subscriptionId = subscriptionIdFromStripeRef(invoiceLike?.subscription as never);
  let customerId = customerIdFromStripeRef(invoiceLike?.customer as never);

  if (subscriptionId && customerId) {
    return { subscriptionId, customerId };
  }

  if (subscriptionId && !customerId) {
    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
    customerId =
      typeof stripeSub.customer === 'string'
        ? stripeSub.customer
        : stripeSub.customer?.id ?? null;
    if (customerId) return { subscriptionId, customerId };
  }

  const customerFromPi = customerIdFromStripeRef(pi.customer as never);
  if (customerFromPi) {
    const list = await stripe.subscriptions.list({
      customer: customerFromPi,
      limit: 15,
      status: 'all',
    });
    const preferred =
      list.data.find((s) => s.status === 'active' || s.status === 'trialing') ?? list.data[0];
    if (preferred) {
      return {
        subscriptionId: preferred.id,
        customerId: customerFromPi,
      };
    }
  }

  return null;
}

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

  // Reparação defensiva: externalId pode ser pi_ (PaymentIntent). Cobranças podem vir com invoice só como ID ou off-session.
  if (subscriptionId.startsWith('pi_')) {
    try {
      const resolved = await resolveSubscriptionFromPaymentIntent(stripe, subscriptionId);
      if (resolved) {
        subscriptionId = resolved.subscriptionId;
        customer = resolved.customerId;
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { externalId: resolved.subscriptionId },
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

