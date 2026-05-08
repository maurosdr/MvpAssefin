import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/** Campos usados na API Stripe (SDK v22 usa tipagem enxuta em Subscription). */
type SubscriptionPeriodFields = {
  metadata: Stripe.Metadata | null;
  status: Stripe.Subscription.Status;
  cancel_at_period_end: boolean | null;
  current_period_start: number;
  current_period_end: number;
};

async function persistSubscriptionFromStripe(
  stripe: Stripe,
  subscriptionId: string,
  fallbackUserId: string,
  fallbackPlanId: string
) {
  const raw = await stripe.subscriptions.retrieve(subscriptionId);
  const sub = raw as unknown as SubscriptionPeriodFields;

  const userId =
    typeof sub.metadata?.user_id === 'string' && sub.metadata.user_id
      ? sub.metadata.user_id
      : fallbackUserId;
  const planId =
    typeof sub.metadata?.plan_id === 'string' && sub.metadata.plan_id
      ? sub.metadata.plan_id
      : fallbackPlanId;
  const planName =
    typeof sub.metadata?.plan_name === 'string' && sub.metadata.plan_name
      ? sub.metadata.plan_name
      : null;
  const priceCentsRaw =
    typeof sub.metadata?.price_cents === 'string' ? Number(sub.metadata.price_cents) : null;
  const currency =
    typeof sub.metadata?.currency === 'string' && sub.metadata.currency ? sub.metadata.currency : null;
  const interval =
    typeof sub.metadata?.interval === 'string' && sub.metadata.interval ? sub.metadata.interval : null;

  const startSec = sub.current_period_start ?? null;
  const endSec = sub.current_period_end ?? null;
  const start = startSec != null ? new Date(startSec * 1000) : null;
  const end = endSec != null ? new Date(endSec * 1000) : null;

  const status =
    sub.status === 'active' || sub.status === 'trialing' ? 'active' : sub.status;

  const data = {
    status,
    externalId: subscriptionId,
    planName: planName ?? undefined,
    priceCents: Number.isFinite(priceCentsRaw as number) ? (priceCentsRaw as number) : undefined,
    currency: currency ?? undefined,
    interval: interval ?? undefined,
    currentPeriodStart: start ?? undefined,
    currentPeriodEnd: end ?? undefined,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
  };

  // Preferimos reconciliar por externalId (Stripe), mas também toleramos o índice composto
  // existente (userId, planId) em bancos já migrados.
  const existingByExternal = await prisma.subscription.findFirst({
    where: { externalId: subscriptionId },
  });

  if (existingByExternal) {
    await prisma.subscription.update({
      where: { id: existingByExternal.id },
      data,
    });
  } else {
    const existingByUserPlan = await prisma.subscription.findFirst({
      where: { userId, planId },
    });

    if (existingByUserPlan) {
      await prisma.subscription.update({
        where: { id: existingByUserPlan.id },
        data,
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId,
          planId,
          ...data,
        },
      });
    }
  }

  // Garante 1 assinatura ativa por usuário (sem depender de índice parcial no Postgres).
  if (status === 'active') {
    await prisma.subscription.updateMany({
      where: {
        userId,
        status: 'active',
        externalId: { not: subscriptionId },
      },
      data: { status: 'cancelled' },
    });
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET não configurado');
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Assinatura ausente' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook Stripe — verificação falhou:', err);
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const stripe = getStripe();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null;

        if (!subscriptionId) {
          break;
        }

        const ref = session.client_reference_id ?? '';
        const parts = ref.split(':');
        const fallbackUserId = parts[0] ?? '';
        const fallbackPlanId = parts[1] ?? '';

        if (!fallbackUserId || !fallbackPlanId) {
          console.warn(
            'checkout.session.completed sem client_reference_id parseável',
            session.id
          );
          break;
        }

        await persistSubscriptionFromStripe(
          stripe,
          subscriptionId,
          fallbackUserId,
          fallbackPlanId
        );
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata.user_id;
        const planId = sub.metadata.plan_id;
        if (!userId || !planId) {
          break;
        }

        if (event.type === 'customer.subscription.deleted') {
          await prisma.subscription.updateMany({
            where: {
              userId,
              planId,
              externalId: sub.id,
            },
            data: {
              status: 'cancelled',
              cancelAtPeriodEnd: false,
            },
          });
          break;
        }

        await persistSubscriptionFromStripe(
          stripe,
          sub.id,
          userId,
          planId
        );
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook Stripe — processamento:', err);
    return NextResponse.json({ error: 'Falha ao processar evento' }, { status: 500 });
  }
}
