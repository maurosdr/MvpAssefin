import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getStripe } from '@/lib/stripe';
import { rateLimit } from '@/lib/rate-limit';
import { getPlanById } from '@/lib/plans';

export const runtime = 'nodejs';

/**
 * Cria uma sessão do Stripe Checkout (assinatura mensal em BRL).
 *
 * Docs: https://stripe.com/docs/api/checkout/sessions/create
 *
 * Env: STRIPE_SECRET_KEY (sk_test_... ou sk_live_...),
 *      NEXT_PUBLIC_BASE_URL (ex.: https://seu-dominio.com)
 *
 * Webhook: configure POST /api/payment/webhook no Stripe Dashboard com
 *          STRIPE_WEBHOOK_SECRET para assinar eventos.
 */

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { key: 'payment_create_preference_post', limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 });
  }
  try {
    const sessionAuth = await auth();
    if (!sessionAuth?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planId } = body as { planId?: string };

    if (!planId) {
      return NextResponse.json(
        { error: 'Plano é obrigatório' },
        { status: 400 }
      );
    }

    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY não configurado' },
        { status: 500 }
      );
    }

    if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
      return NextResponse.json(
        {
          error:
            'Chave secreta Stripe inválida. Use sk_test_... (teste) ou sk_live_... (produção)',
          hint: 'https://dashboard.stripe.com/apikeys',
        },
        { status: 400 }
      );
    }

    const baseUrl_app =
      process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl_app}/subscription/success?plan=${encodeURIComponent(planId)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl_app}/subscription/failure?plan=${encodeURIComponent(planId)}`;

    if (!successUrl.includes('http')) {
      return NextResponse.json(
        {
          error: 'URL de sucesso não configurada',
          hint: 'Configure NEXT_PUBLIC_BASE_URL no .env',
          debug: { baseUrl_app, successUrl },
        },
        { status: 400 }
      );
    }

    const unitAmount = Math.round(plan.priceCents);
    if (unitAmount < 50) {
      return NextResponse.json(
        {
          error: 'Valor mínimo para cobrança em BRL (Stripe): R$ 0,50',
        },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    const displayName = plan.description;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            unit_amount: unitAmount,
            recurring: {
              interval: plan.interval,
            },
            product_data: {
              name: displayName,
              description: `Plano ${plan.name} — cobrança ${plan.interval === 'month' ? 'mensal' : plan.interval}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: `${sessionAuth.user.id}:${planId}`,
      customer_email: sessionAuth.user.email ?? undefined,
      subscription_data: {
        metadata: {
          user_id: sessionAuth.user.id,
          plan_id: String(planId),
          plan_name: String(plan.name),
          price_cents: String(plan.priceCents),
          currency: String(plan.currency),
          interval: String(plan.interval),
        },
      },
      metadata: {
        user_id: sessionAuth.user.id,
        plan_id: String(planId),
        plan_name: String(plan.name),
        price_cents: String(plan.priceCents),
        currency: String(plan.currency),
        interval: String(plan.interval),
      },
    });

    const checkoutUrl = checkoutSession.url;
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: 'Stripe não retornou URL de checkout' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      id: checkoutSession.id,
      init_point: checkoutUrl,
      url: checkoutUrl,
    });
  } catch (error) {
    console.error('Erro na API de pagamento (Stripe):', error);
    const message =
      error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json(
      {
        error: 'Erro ao criar sessão de pagamento',
        details: message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Método não permitido',
      hint: 'Use POST para criar a sessão de pagamento (Stripe Checkout).',
      example: {
        method: 'POST',
        url: '/api/payment/create-preference',
        body: { planId: 'pro', planName: 'Pro', price: 79, description: 'Assinatura Pro - Assefin' },
      },
    },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
