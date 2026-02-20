import { NextRequest, NextResponse } from 'next/server';

/**
 * Webhook do Mercado Pago para receber notificações de pagamento
 * 
 * Configure esta URL no painel do Mercado Pago:
 * https://www.mercadopago.com.br/developers/panel/app
 * 
 * O Mercado Pago enviará notificações quando:
 * - Um pagamento for aprovado
 * - Um pagamento for rejeitado
 * - Um pagamento estiver pendente
 * - Um pagamento for cancelado
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // Verificar se é uma notificação de pagamento
    if (type === 'payment') {
      const paymentId = data.id;

      // Buscar informações do pagamento no Mercado Pago
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-ACCESS-TOKEN';
      
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!paymentResponse.ok) {
        console.error('Erro ao buscar pagamento:', await paymentResponse.text());
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const payment = await paymentResponse.json();

      // Processar o pagamento baseado no status
      const status = payment.status;
      const externalReference = payment.external_reference; // ID do plano
      const metadata = payment.metadata;

      console.log('Pagamento recebido:', {
        paymentId,
        status,
        planId: externalReference,
        amount: payment.transaction_amount,
      });

      // Aqui você deve:
      // 1. Atualizar o status da assinatura no banco de dados
      // 2. Ativar os recursos do plano para o usuário
      // 3. Enviar email de confirmação
      // 4. Registrar a transação

      // Exemplo de lógica (substitua pela sua implementação):
      if (status === 'approved') {
        // Pagamento aprovado - ativar assinatura
        // await activateSubscription(payment.payer.email, externalReference);
        console.log('Assinatura ativada para plano:', externalReference);
      } else if (status === 'rejected' || status === 'cancelled') {
        // Pagamento rejeitado/cancelado
        console.log('Pagamento rejeitado/cancelado para plano:', externalReference);
      } else if (status === 'pending') {
        // Pagamento pendente
        console.log('Pagamento pendente para plano:', externalReference);
      }
    }

    // Sempre retornar 200 para o Mercado Pago
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Erro no webhook do Mercado Pago:', error);
    // Mesmo com erro, retornar 200 para evitar reenvios
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

// GET para verificação do webhook (opcional)
export async function GET() {
  return NextResponse.json({ 
    message: 'Webhook endpoint ativo',
    instructions: 'Configure esta URL no painel do Mercado Pago como notification_url'
  });
}

