import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Forçar Node.js runtime
export const runtime = 'nodejs';

/**
 * API Route para criar preferência de pagamento no Mercado Pago
 * 
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/integration-configuration/integrate-checkout-pro
 * 
 * Para usar em produção, você precisa:
 * 1. Criar uma conta no Mercado Pago Developers: https://www.mercadopago.com.br/developers
 * 2. Obter suas credenciais (Access Token) em: https://www.mercadopago.com.br/developers/panel/credentials
 * 3. Configurar as variáveis de ambiente:
 *    - MERCADOPAGO_ACCESS_TOKEN (token de produção)
 *    - MERCADOPAGO_PUBLIC_KEY (chave pública - opcional, para frontend)
 * 4. Configurar URLs de retorno em: https://www.mercadopago.com.br/developers/panel/app
 */

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planId, planName, price, description } = body;

    if (!planId || !planName || !price) {
      return NextResponse.json(
        { error: 'Dados do plano são obrigatórios' },
        { status: 400 }
      );
    }

    // Obter Access Token do Mercado Pago
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'MERCADOPAGO_ACCESS_TOKEN não configurado' },
        { status: 500 }
      );
    }

    // Validar formato do token
    if (!accessToken.startsWith('TEST-') && !accessToken.startsWith('APP_USR-')) {
      return NextResponse.json(
        { 
          error: 'Token inválido. Use um token de TESTE (TEST-...) ou PRODUÇÃO (APP_USR-...)',
          hint: 'Obtenha em: https://www.mercadopago.com.br/developers/panel/credentials'
        },
        { status: 400 }
      );
    }

    // URL base do Mercado Pago
    const baseUrl = 'https://api.mercadopago.com';

    // Construir URLs de retorno
    const baseUrl_app = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl_app}/subscription/success?plan=${planId}`;
    const failureUrl = `${baseUrl_app}/subscription/failure?plan=${planId}`;
    const pendingUrl = `${baseUrl_app}/subscription/pending?plan=${planId}`;
    const webhookUrl = `${baseUrl_app}/api/payment/webhook`;

    // Validar URLs
    if (!successUrl || !successUrl.includes('http')) {
      return NextResponse.json(
        { 
          error: 'URL de sucesso não configurada',
          hint: 'Configure NEXT_PUBLIC_BASE_URL no .env',
          debug: { baseUrl_app, successUrl }
        },
        { status: 400 }
      );
    }

    // Criar preferência de pagamento
    const preferenceData: Record<string, unknown> = {
      items: [
        {
          title: description || `Assinatura ${planName} - Assefin`,
          description: `Plano ${planName} - Assinatura mensal`,
          quantity: 1,
          unit_price: parseFloat(price),
          currency_id: 'BRL',
        },
      ],
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
    };

    // Só adicionar auto_return se success URL estiver definida
    if (successUrl && successUrl.includes('http')) {
      preferenceData.auto_return = 'approved';
    }

    // Adicionar webhook apenas se URL válida
    if (webhookUrl && webhookUrl.includes('http')) {
      preferenceData.notification_url = webhookUrl;
    }

    // Adicionar outros campos
    preferenceData.statement_descriptor = 'ASSEFIN';
    preferenceData.external_reference = `${session.user.id}:${planId}`;
    preferenceData.metadata = {
      user_id: session.user.id,
      user_email: session.user.email,
      plan_id: planId,
      plan_name: planName,
    };

    // Fazer requisição para o Mercado Pago
    const response = await fetch(`${baseUrl}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao criar preferência no Mercado Pago:', errorData);
      
      // Mensagens de erro mais amigáveis
      let errorMessage = 'Erro ao criar preferência de pagamento';
      let hint = '';
      
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Credenciais inválidas ou sem permissão';
        hint = 'Verifique se o Access Token está correto e é um token de TESTE (TEST-...). Obtenha em: https://www.mercadopago.com.br/developers/panel/credentials';
      } else if (response.status === 400) {
        errorMessage = 'Dados inválidos na requisição';
        hint = errorData.message || 'Verifique os dados enviados';
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorData,
          hint,
          status: response.status
        },
        { status: response.status }
      );
    }

    const preference = await response.json();

    // Em desenvolvimento, usar sandbox_init_point se disponível
    // Em produção, usar init_point
    const isDevelopment = process.env.NODE_ENV === 'development';
    const checkoutUrl = isDevelopment && preference.sandbox_init_point 
      ? preference.sandbox_init_point 
      : preference.init_point;

    return NextResponse.json({
      id: preference.id,
      init_point: checkoutUrl,
      sandbox_init_point: preference.sandbox_init_point,
    });
  } catch (error) {
    console.error('Erro na API de pagamento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}



