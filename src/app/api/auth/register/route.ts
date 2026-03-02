import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Forçar Node.js runtime para suportar bcrypt
export const runtime = 'nodejs';

// Função para validar CPF
function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleanCPF)) return false; // Todos os dígitos iguais
  
  // Validar dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').optional(),
  phone: z.string()
    .min(10, 'Telefone inválido')
    .regex(/^[\d\s\(\)\-\+]+$/, 'Telefone deve conter apenas números e caracteres de formatação')
    .refine((val) => {
      const clean = val.replace(/\D/g, '');
      return clean.length >= 10 && clean.length <= 15;
    }, 'Telefone deve ter entre 10 e 15 dígitos'),
  cpf: z.string()
    .min(11, 'CPF inválido')
    .refine((val) => {
      const clean = val.replace(/\D/g, '');
      return clean.length === 11 && validateCPF(val);
    }, 'CPF inválido'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar dados
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, name, phone, cpf } = validation.data;

    // Verificar se usuário já existe (email)
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado' },
        { status: 400 }
      );
    }

    // Verificar se CPF já existe
    if (cpf) {
      const cleanCPF = cpf.replace(/\D/g, '');
      const existingCPF = await prisma.user.findUnique({
        where: { cpf: cleanCPF },
      });
      if (existingCPF) {
        return NextResponse.json(
          { error: 'Este CPF já está cadastrado' },
          { status: 400 }
        );
      }
    }

    // Criar usuário
    const user = await createUser(email, password, name, phone, cpf);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar conta. Tente novamente.' },
      { status: 500 }
    );
  }
}

