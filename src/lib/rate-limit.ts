import type { NextRequest } from 'next/server';

type Bucket = { count: number; resetAt: number };

function nowMs() {
  return Date.now();
}

function getClientIp(req: NextRequest): string {
  // In production behind a proxy, you may need to trust forwarded headers.
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function getStore(): Map<string, Bucket> {
  const g = globalThis as unknown as { __assefinRateLimit?: Map<string, Bucket> };
  if (!g.__assefinRateLimit) g.__assefinRateLimit = new Map();
  return g.__assefinRateLimit;
}

export function rateLimit(req: NextRequest, opts: { key: string; limit: number; windowMs: number }) {
  const store = getStore();
  const ip = getClientIp(req);
  const k = `${opts.key}:${ip}`;
  const t = nowMs();
  const cur = store.get(k);

  if (!cur || t >= cur.resetAt) {
    store.set(k, { count: 1, resetAt: t + opts.windowMs });
    return { ok: true as const, remaining: opts.limit - 1, resetAt: t + opts.windowMs };
  }

  if (cur.count >= opts.limit) {
    return { ok: false as const, remaining: 0, resetAt: cur.resetAt };
  }

  cur.count += 1;
  store.set(k, cur);
  return { ok: true as const, remaining: opts.limit - cur.count, resetAt: cur.resetAt };
}

