import { NextRequest, NextResponse } from 'next/server';
import { getStockName } from '@/lib/stocks-data';
import { getRISite } from '@/lib/ri-sites';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;

const WA_API_URL = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

// GET: Meta webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST: receive incoming WhatsApp messages
export async function POST(request: NextRequest) {
  // Always return 200 to Meta — they retry on anything else
  try {
    const body = await request.json().catch(() => ({}));

    const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages?.length) return NextResponse.json({ status: 'ok' });

    const message = messages[0];
    if (message.type !== 'text') return NextResponse.json({ status: 'ok' });

    const from: string = normalizeBrazilianNumber(message.from);
    const text: string = message?.text?.body?.trim().toUpperCase() ?? '';
    if (!text) return NextResponse.json({ status: 'ok' });

    const stock = await fetchStockFromBrapi(text);
    const reply = stock
      ? formatStockMessage(stock, text)
      : `Não encontrei dados para *${text}*.\n\nVerifique o ticker e tente novamente. Ex: PETR4, VALE3, ITUB4`;

    await sendWhatsAppMessage(from, reply);
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
  }

  return NextResponse.json({ status: 'ok' });
}

// Brazilian mobile numbers gained a 9th digit in 2012.
// Meta's webhook strips it (wa_id is 12 digits), but the API needs 13.
function normalizeBrazilianNumber(num: string): string {
  if (num.startsWith('55') && num.length === 12) {
    return num.slice(0, 4) + '9' + num.slice(4);
  }
  return num;
}

async function fetchStockFromBrapi(symbol: string) {
  const res = await fetch(`https://brapi.dev/api/quote/${symbol}`, {
    headers: { Authorization: 'Bearer kAohDLSrNNS3JNZijP4voJ' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.results?.[0] ?? null;
}

function formatStockMessage(stock: Record<string, unknown>, symbol: string): string {
  const name =
    (stock.longName as string) ||
    (stock.shortName as string) ||
    getStockName(symbol) ||
    symbol;

  const price = typeof stock.regularMarketPrice === 'number' ? stock.regularMarketPrice.toFixed(2) : '—';
  const change = typeof stock.regularMarketChange === 'number' ? stock.regularMarketChange.toFixed(2) : '—';
  const changePct =
    typeof stock.regularMarketChangePercent === 'number'
      ? stock.regularMarketChangePercent.toFixed(2)
      : '—';
  const prevClose =
    typeof stock.regularMarketPreviousClose === 'number'
      ? stock.regularMarketPreviousClose.toFixed(2)
      : '—';

  const pct = parseFloat(changePct);
  const arrow = !isNaN(pct) && pct >= 0 ? '▲' : '▼';
  const sign = !isNaN(pct) && pct >= 0 ? '+' : '';
  const riSite = getRISite(symbol);

  let msg = `*${symbol} — ${name}*\n\n`;
  msg += `💰 Preço: R$ ${price}\n`;
  msg += `${arrow} Variação: ${sign}${changePct}% (${sign}R$ ${change})\n`;
  msg += `📅 Fechamento anterior: R$ ${prevClose}\n`;
  if (riSite) msg += `\n🔗 Site RI: ${riSite}`;

  return msg;
}

async function sendWhatsAppMessage(to: string, text: string) {
  const res = await fetch(WA_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('WhatsApp send error:', err);
    return; // log but don't throw — let the caller handle gracefully
  }
  return res.json();
}
