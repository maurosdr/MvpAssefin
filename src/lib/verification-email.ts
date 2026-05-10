import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { normalizeEmail } from '@/lib/auth';
import { getPublicAppUrl, isSmtpConfigured, sendTransactionalEmail } from '@/lib/email';
import { isProd } from '@/lib/env';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function createEmailVerificationToken(email: string): Promise<string> {
  const identifier = normalizeEmail(email);
  await prisma.verificationToken.deleteMany({ where: { identifier } });

  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  return token;
}

export async function sendVerificationEmailForUser(params: {
  email: string;
  name?: string | null;
}): Promise<void> {
  const token = await createEmailVerificationToken(params.email);
  const base = getPublicAppUrl();
  const verifyUrl = `${base}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  if (!isSmtpConfigured() && !isProd()) {
    console.warn('[dev] Link de verificação de e-mail (SMTP não configurado):', verifyUrl);
  }

  const greeting = params.name?.trim() ? `Olá, ${params.name.trim()}` : 'Olá';

  const text = `${greeting},

Confirme seu e-mail da Assefin clicando no link abaixo (válido por 24 horas):

${verifyUrl}

Se você não criou esta conta, ignore este e-mail.

— Assefin`;

  const html = `
<p>${greeting},</p>
<p>Confirme seu e-mail da <strong>Assefin</strong> clicando no botão abaixo (válido por 24 horas).</p>
<p><a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Confirmar e-mail</a></p>
<p style="font-size:12px;color:#666;">Ou copie e cole este endereço no navegador:<br/><span style="word-break:break-all;">${verifyUrl}</span></p>
<p style="font-size:12px;color:#666;">Se você não criou esta conta, ignore este e-mail.</p>
`;

  await sendTransactionalEmail({
    to: normalizeEmail(params.email),
    subject: 'Confirme seu e-mail — Assefin',
    text,
    html,
  });
}
