import { NextRequest, NextResponse } from 'next/server';

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
    const body = await request.json();
    const { planId, planName, price, description } = body;

    if (!planId || !planName || !price) {
      return NextResponse.json(
        { error: 'Dados do plano são obrigatórios' },
        { status: 400 }
      );
    }

    // Obter Access Token do Mercado Pago
    // Em produção, use variável de ambiente: process.env.MERCADOPAGO_ACCESS_TOKEN
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-ACCESS-TOKEN';

    // URL base do Mercado Pago
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api.mercadopago.com'
      : 'https://api.mercadopago.com'; // Mesma URL para test e produção

    // Criar preferência de pagamento
    const preferenceData = {
      items: [
        {
          title: description || `Assinatura ${planName} - Assefin`,
          description: `Plano ${planName} - Assinatura mensal`,
          quantity: 1,
          unit_price: parseFloat(price),
          currency_id: 'BRL',
        },
      ],
      payer: {
        // O email será coletado no checkout do Mercado Pago
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/subscription/success?plan=${planId}`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/subscription/failure?plan=${planId}`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/subscription/pending?plan=${planId}`,
      },
      auto_return: 'approved', // Redireciona automaticamente após pagamento aprovado
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payment/webhook`,
      statement_descriptor: 'ASSEFIN',
      external_reference: planId, // ID do plano para rastreamento
      metadata: {
        plan_id: planId,
        plan_name: planName,
      },
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
      return NextResponse.json(
        { error: 'Erro ao criar preferência de pagamento', details: errorData },
        { status: response.status }
      );
    }

    const preference = await response.json();

    return NextResponse.json({
      id: preference.id,
      init_point: preference.init_point, // URL para redirecionar o usuário
      sandbox_init_point: preference.sandbox_init_point, // URL para ambiente de teste
    });
  } catch (error) {
    console.error('Erro na API de pagamento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

