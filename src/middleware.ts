import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware simplificado - verifica apenas o cookie de sessão
export async function middleware(request: NextRequest) {
  // Verificar se existe cookie de sessão do NextAuth
  const sessionToken = request.cookies.get('authjs.session-token') || 
                       request.cookies.get('__Secure-authjs.session-token');
  
  if (!sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/subscription/:path*',
    '/api/subscription/:path*',
    '/api/exchange/:path*',
    '/api/binance/:path*',
    // Adicione outras rotas protegidas aqui
  ],
};


