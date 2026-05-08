import crypto from 'crypto';

function getKey(): Buffer {
  const raw = process.env.EXCHANGE_KEYS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('EXCHANGE_KEYS_ENCRYPTION_KEY não configurado (base64 de 32 bytes)');
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('EXCHANGE_KEYS_ENCRYPTION_KEY inválido: esperado 32 bytes em base64');
  }
  return key;
}

export function encryptJson(value: unknown): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // v1.<iv>.<tag>.<ciphertext>
  return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
}

export function decryptJson<T>(token: string): T {
  const key = getKey();
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('cookie inválido');
  }
  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const ciphertext = Buffer.from(parts[3], 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8')) as T;
}

