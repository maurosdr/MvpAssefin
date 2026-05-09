import type { NextRequest } from 'next/server';

function stripTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, '');
}

/** Extrai origem (protocolo + host) de uma URL absoluta. */
function originFromUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  try {
    const u = new URL(url.trim());
    return `${u.protocol}//${u.host}`;
  } catch {
    return undefined;
  }
}

/**
 * URL pública do app (Stripe success/cancel, links absolutos).
 *
 * Ordem: env explícito → NEXTAUTH_URL/AUTH_URL → headers do proxy (Caddy/nginx)
 * → localhost em dev.
 */
export function getPublicBaseUrl(request: NextRequest): string {
  const explicit =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (explicit) {
    return stripTrailingSlashes(explicit);
  }

  const fromAuth =
    originFromUrl(process.env.AUTH_URL) ||
    originFromUrl(process.env.NEXTAUTH_URL);
  if (fromAuth) {
    return stripTrailingSlashes(fromAuth);
  }

  if (process.env.VERCEL_URL?.trim()) {
    return stripTrailingSlashes(`https://${process.env.VERCEL_URL.trim()}`);
  }

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
  if (forwardedHost) {
    return stripTrailingSlashes(`${forwardedProto}://${forwardedHost}`);
  }

  const host = request.headers.get('host')?.trim();
  if (host) {
    const isLocal =
      host.startsWith('localhost') ||
      host.startsWith('127.0.0.1') ||
      host.startsWith('[::1]');
    const proto =
      request.headers.get('x-forwarded-proto')?.trim() ||
      (isLocal ? 'http' : 'https');
    return stripTrailingSlashes(`${proto}://${host}`);
  }

  return 'http://localhost:3000';
}
