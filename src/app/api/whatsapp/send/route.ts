import { NextRequest, NextResponse } from 'next/server';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

const WA_API_URL = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const to: string = body.to;

  if (!to) {
    return NextResponse.json({ error: 'Missing "to" phone number' }, { status: 400 });
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
        language: { code: 'en_US' },
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data }, { status: res.status });
  }

  return NextResponse.json({ success: true, data });
}
