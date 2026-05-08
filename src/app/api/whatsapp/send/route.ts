import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { rateLimit } from '@/lib/rate-limit';
import { requireEnv } from '@/lib/env';

const WHATSAPP_TOKEN = requireEnv('WHATSAPP_TOKEN');
const PHONE_NUMBER_ID = requireEnv('WHATSAPP_PHONE_NUMBER_ID');

const WA_API_URL = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { key: 'whatsapp_send_post', limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const to: string = body.to;

  if (!to) {
    return NextResponse.json({ error: 'Telefone de destino ("to") é obrigatório' }, { status: 400 });
  }

  // WhatsApp Business API requires a pre-approved template to initiate conversations.
  // The hello_world template is available on all accounts by default.
  // Once the user replies, the 24h session opens and the webhook can send free-form messages.
  const res = await fetch(WA_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: 'hello_world',
        language: { code: 'pt_BR' },
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data }, { status: res.status });
  }

  return NextResponse.json({ success: true, data });
}
