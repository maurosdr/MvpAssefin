import nodemailer from 'nodemailer';
import { isProd } from '@/lib/env';

export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  return Boolean(host && user && pass);
}

function getFromAddress(): string {
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim();
  if (!from) {
    throw new Error('SMTP_FROM ou SMTP_USER não configurado');
  }
  return from;
}

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  if (!isSmtpConfigured()) {
    if (isProd()) {
      throw new Error('SMTP não configurado (defina SMTP_HOST, SMTP_USER, SMTP_PASS)');
    }
    console.warn('[email] SMTP não configurado — simulando envio (dev):');
    console.warn(`  Para: ${params.to}`);
    console.warn(`  Assunto: ${params.subject}`);
    console.warn(`  Corpo (trecho): ${params.text.slice(0, 200)}…`);
    return;
  }

  const port = Number(process.env.SMTP_PORT || '587');
  const secure =
    process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1' || port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: getFromAddress(),
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}

export function getPublicAppUrl(): string {
  const url =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (url) return url.replace(/\/$/, '');
  if (!isProd()) return 'http://localhost:3000';
  throw new Error('Defina AUTH_URL ou NEXTAUTH_URL para links de verificação por e-mail');
}
