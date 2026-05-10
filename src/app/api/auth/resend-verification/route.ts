import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { getUserByEmail } from '@/lib/auth';
import { sendVerificationEmailForUser } from '@/lib/verification-email';
import { isProd } from '@/lib/env';
import { isSmtpConfigured } from '@/lib/email';
import { getPublicAppUrl } from '@/lib/email';

export const runtime = 'nodejs';

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { key: 'auth_resend_verification_post', limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Muitas requisições. Aguarde um minuto.' }, { status: 429 });
  }

  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
    }

    const email = parsed.data.email;

    if (isProd()) {
      if (!isSmtpConfigured()) {
        return NextResponse.json({ error: 'Serviço de e-mail indisponível.' }, { status: 503 });
      }
      try {
        getPublicAppUrl();
      } catch {
        return NextResponse.json({ error: 'Serviço de e-mail indisponível.' }, { status: 503 });
      }
    }

    const user = await getUserByEmail(email);
    if (!user || user.emailVerified) {
      return NextResponse.json({ ok: true });
    }

    await sendVerificationEmailForUser({ email: user.email, name: user.name });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('resend-verification:', e);
    return NextResponse.json({ error: 'Não foi possível reenviar o e-mail.' }, { status: 500 });
  }
}
