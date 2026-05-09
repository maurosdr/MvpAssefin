import { compare, hash } from 'bcryptjs';
import { prisma } from './prisma';

/** Email para login/cadastro: trim + minúsculas (comportamento esperado para endereços). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

export async function createUser(
  email: string, 
  password: string, 
  name?: string, 
  phone?: string, 
  cpf?: string
) {
  const hashedPassword = await hashPassword(password);
  const emailStored = normalizeEmail(email);

  return prisma.user.create({
    data: {
      email: emailStored,
      password: hashedPassword,
      name,
      phone: phone ? phone.replace(/\D/g, '') : null, // Remove caracteres não numéricos
      cpf: cpf ? cpf.replace(/\D/g, '') : null, // Remove caracteres não numéricos
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      cpf: true,
      createdAt: true,
    },
  });
}

export async function getUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const matches = await prisma.user.findMany({
    where: { email: { equals: normalized, mode: 'insensitive' } },
    take: 2,
  });
  // Se houver duplicidade por case, tratamos como "existe" (evita criar outra conta).
  return matches[0] ?? null;
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      image: true,
      createdAt: true,
    },
  });
}



