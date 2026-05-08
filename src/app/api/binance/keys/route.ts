import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { rateLimit } from '@/lib/rate-limit';
import { encryptJson, decryptJson } from '@/lib/crypto-cookie';

const COOKIE_NAME = 'binance_keys';

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { key: 'binance_keys_post', limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
  }
  try {
    const { apiKey, secret } = await request.json();

    if (!apiKey || !secret) {
      return NextResponse.json({ error: 'API Key e Secret são obrigatórias' }, { status: 400 });
    }

    const encoded = encryptJson({ apiKey, secret });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, encoded, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }
  try {
    const cookieStore = await cookies();
    const encoded = cookieStore.get(COOKIE_NAME)?.value;

    if (!encoded) {
      return NextResponse.json({ connected: false });
    }

    const { apiKey } = decryptJson<{ apiKey: string }>(encoded);
    return NextResponse.json({
      connected: true,
      apiKeyPreview: apiKey.slice(0, 6) + '...' + apiKey.slice(-4),
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
  }
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ success: true });
}
