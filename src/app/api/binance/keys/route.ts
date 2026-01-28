import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'binance_keys';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, secret } = await request.json();

    if (!apiKey || !secret) {
      return NextResponse.json({ error: 'API Key and Secret are required' }, { status: 400 });
    }

    // Store encrypted in httpOnly cookie (in production, use proper encryption + DB)
    const encoded = Buffer.from(JSON.stringify({ apiKey, secret })).toString('base64');

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
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const encoded = cookieStore.get(COOKIE_NAME)?.value;

    if (!encoded) {
      return NextResponse.json({ connected: false });
    }

    const { apiKey } = JSON.parse(Buffer.from(encoded, 'base64').toString());
    return NextResponse.json({
      connected: true,
      apiKeyPreview: apiKey.slice(0, 6) + '...' + apiKey.slice(-4),
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ success: true });
}
