export function requireEnv(name: string): string {
  const v = process.env[name];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`${name} não configurado`);
  }
  return v;
}

export function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

