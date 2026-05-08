import { handlers } from '../../../../auth';

// Forçar Node.js runtime (não edge) para suportar bcrypt e Prisma
export const runtime = 'nodejs';

export const { GET, POST } = handlers;


