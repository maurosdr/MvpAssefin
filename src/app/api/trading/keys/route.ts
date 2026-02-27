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
  const anthropicRaw = cookieStore.get('ai_anthropic_key')?.value ?? '';
  const geminiRaw = cookieStore.get('ai_gemini_key')?.value ?? '';
  const openaiRaw = cookieStore.get('ai_openai_key')?.value ?? '';

  return NextResponse.json({
    anthropic: {
      configured: anthropicRaw.length > 0,
      preview: anthropicRaw.length > 0 ? keyPreview(anthropicRaw) : null,
    },
    gemini: {
      configured: geminiRaw.length > 0,
      preview: geminiRaw.length > 0 ? keyPreview(geminiRaw) : null,
    },
    openai: {
      configured: openaiRaw.length > 0,
      preview: openaiRaw.length > 0 ? keyPreview(openaiRaw) : null,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { anthropicKey, geminiKey, openaiKey } = await req.json();

    const response = NextResponse.json({ success: true });

    if (anthropicKey && typeof anthropicKey === 'string' && anthropicKey.trim()) {
      response.cookies.set('ai_anthropic_key', anthropicKey.trim(), COOKIE_OPTS);
    }
    if (geminiKey && typeof geminiKey === 'string' && geminiKey.trim()) {
      response.cookies.set('ai_gemini_key', geminiKey.trim(), COOKIE_OPTS);
    }
    if (openaiKey && typeof openaiKey === 'string' && openaiKey.trim()) {
      response.cookies.set('ai_openai_key', openaiKey.trim(), COOKIE_OPTS);
    }

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { provider } = await req.json();
    const response = NextResponse.json({ success: true });

    if (provider === 'anthropic' || provider === 'all') {
      response.cookies.set('ai_anthropic_key', '', { ...COOKIE_OPTS, maxAge: 0 });
    }
    if (provider === 'gemini' || provider === 'all') {
      response.cookies.set('ai_gemini_key', '', { ...COOKIE_OPTS, maxAge: 0 });
    }
    if (provider === 'openai' || provider === 'all') {
      response.cookies.set('ai_openai_key', '', { ...COOKIE_OPTS, maxAge: 0 });
    }

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
