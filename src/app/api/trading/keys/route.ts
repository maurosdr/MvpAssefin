import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: '/',
};

function keyPreview(key: string): string {
  if (key.length <= 10) return '***';
  return key.slice(0, 6) + '...' + key.slice(-4);
}

export async function GET() {
  const cookieStore = cookies();
  const anthropicRaw   = cookieStore.get('ai_anthropic_key')?.value   ?? '';
  const geminiRaw      = cookieStore.get('ai_gemini_key')?.value      ?? '';
  const openaiRaw      = cookieStore.get('ai_openai_key')?.value      ?? '';
  const polymarketRaw  = cookieStore.get('ai_polymarket_key')?.value  ?? '';
  const kalshiRaw      = cookieStore.get('ai_kalshi_key')?.value      ?? '';

  const mkStatus = (raw: string) => ({
    configured: raw.length > 0,
    preview: raw.length > 0 ? keyPreview(raw) : null,
  });

  return NextResponse.json({
    anthropic:  mkStatus(anthropicRaw),
    gemini:     mkStatus(geminiRaw),
    openai:     mkStatus(openaiRaw),
    polymarket: mkStatus(polymarketRaw),
    kalshi:     mkStatus(kalshiRaw),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { anthropicKey, geminiKey, openaiKey, polymarketKey, kalshiKey } = await req.json();

    const response = NextResponse.json({ success: true });

    const set = (cookieName: string, value: unknown) => {
      if (value && typeof value === 'string' && value.trim()) {
        response.cookies.set(cookieName, value.trim(), COOKIE_OPTS);
      }
    };

    set('ai_anthropic_key',  anthropicKey);
    set('ai_gemini_key',     geminiKey);
    set('ai_openai_key',     openaiKey);
    set('ai_polymarket_key', polymarketKey);
    set('ai_kalshi_key',     kalshiKey);

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { provider } = await req.json();
    const response = NextResponse.json({ success: true });

    const clear = (cookieName: string, match: string) => {
      if (provider === match || provider === 'all') {
        response.cookies.set(cookieName, '', { ...COOKIE_OPTS, maxAge: 0 });
      }
    };

    clear('ai_anthropic_key',  'anthropic');
    clear('ai_gemini_key',     'gemini');
    clear('ai_openai_key',     'openai');
    clear('ai_polymarket_key', 'polymarket');
    clear('ai_kalshi_key',     'kalshi');

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
