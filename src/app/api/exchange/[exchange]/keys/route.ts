import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SUPPORTED_EXCHANGES = ['binance', 'coinbase'];

function getCookieName(exchange: string): string {
  return `exchange_keys_${exchange}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ exchange: string }> }
) {
  try {
    const { exchange } = await params;

    if (!SUPPORTED_EXCHANGES.includes(exchange)) {
      return NextResponse.json(
        { error: `Unsupported exchange: ${exchange}. Supported: ${SUPPORTED_EXCHANGES.join(', ')}` },
        { status: 400 }
      );
    }

    const { apiKey, secret } = await request.json();

    if (!apiKey || !secret) {
      return NextResponse.json({ error: 'API Key and Secret are required' }, { status: 400 });
    }

    const encoded = Buffer.from(JSON.stringify({ apiKey, secret })).toString('base64');

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
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ exchange: string }> }
) {
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

    const { apiKey } = JSON.parse(Buffer.from(encoded, 'base64').toString());
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
  const { exchange } = await params;
  const cookieStore = await cookies();
  cookieStore.delete(getCookieName(exchange));
  return NextResponse.json({ success: true });
}
