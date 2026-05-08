import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { rateLimit } from '@/lib/rate-limit';
import { encryptJson, decryptJson } from '@/lib/crypto-cookie';

const SUPPORTED_EXCHANGES = ['binance', 'coinbase'];

function getCookieName(exchange: string): string {
  return `exchange_keys_${exchange}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ exchange: string }> }
) {
  const rl = rateLimit(request, { key: 'exchange_keys_post', limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
  }

  try {
    const { exchange } = await params;

    if (!SUPPORTED_EXCHANGES.includes(exchange)) {
      return NextResponse.json(
        { error: `Corretora não suportada: ${exchange}. Suportadas: ${SUPPORTED_EXCHANGES.join(', ')}` },
        { status: 400 }
      );
    }

    const { apiKey, secret } = await request.json();

    if (!apiKey || !secret) {
      return NextResponse.json({ error: 'API Key e Secret são obrigatórias' }, { status: 400 });
    }

    const encoded = encryptJson({ apiKey, secret });

    const cookieStore = await cookies();
    cookieStore.set(getCookieName(exchange), encoded, {
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ exchange: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }
  try {
    const { exchange } = await params;

    if (!SUPPORTED_EXCHANGES.includes(exchange)) {
      return NextResponse.json({ connected: false });
    }

    const cookieStore = await cookies();
    const encoded = cookieStore.get(getCookieName(exchange))?.value;

    if (!encoded) {
      return NextResponse.json({ connected: false });
    }

    const { apiKey } = decryptJson<{ apiKey: string }>(encoded);
    return NextResponse.json({
      connected: true,
      exchange,
      apiKeyPreview: apiKey.slice(0, 6) + '...' + apiKey.slice(-4),
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ exchange: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
  }
  const { exchange } = await params;
  const cookieStore = await cookies();
  cookieStore.delete(getCookieName(exchange));
  return NextResponse.json({ success: true });
}
