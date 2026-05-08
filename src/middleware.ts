import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware simplificado - verifica apenas o cookie de sessão
export async function middleware(request: NextRequest) {
  // Verificar se existe cookie de sessão do NextAuth
  const sessionToken = request.cookies.get('authjs.session-token') || 
                       request.cookies.get('__Secure-authjs.session-token');
  
  const res = sessionToken
    ? NextResponse.next()
    : request.nextUrl.pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
      : NextResponse.redirect(Object.assign(request.nextUrl.clone(), { pathname: '/login' }));

  // Basic security headers (safe defaults).
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('X-DNS-Prefetch-Control', 'off');
  res.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return res;
}

export const config = {
  matcher: [
    // Proteger apenas APIs de assinatura (criar, cancelar, etc)
    '/api/subscription/create/:path*',
    '/api/subscription/cancel/:path*',
    '/api/subscription/status/:path*',
    '/api/exchange/:path*',
    '/api/binance/:path*',
    '/api/payment/create-preference',
    // Adicione outras rotas protegidas aqui
  ],
};


