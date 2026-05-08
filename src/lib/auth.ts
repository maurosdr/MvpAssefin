import { compare, hash } from 'bcryptjs';
import { prisma } from './prisma';

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
  
  return prisma.user.create({
    data: {
      email,
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
  return prisma.user.findUnique({
    where: { email },
  });
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



