'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Básico',
    price: 29.90,
    description: 'Ideal para iniciantes',
    features: [
      'Acesso a dados de mercado em tempo real',
      'Análises básicas de ações e criptomoedas',
      'Notícias financeiras atualizadas',
      'Suporte por e-mail',
      '',
      '',
    ],
  },
  {
    id: 'pro',
    name: 'Profissional',
    price: 69.90,
    description: 'Para traders ativos',
    popular: true,
    features: [
      'Tudo do plano Básico',
      'Análises técnicas avançadas',
      'Alertas personalizados',
      'Backtesting de estratégias',
      'API access',
      'Suporte prioritário',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 109.90,
    description: 'Máxima performance',
    features: [
      'Tudo do plano Profissional',
      'Dados históricos completos',
      'Análise de sentimento',
      'Sinais de trading em tempo real',
      'Consultoria personalizada',
      'Suporte 24/7',
    ],
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (planId: string) => {
    setSelectedPlan(planId);
    setLoading(true);

    try {
      const plan = PLANS.find(p => p.id === planId);
      if (!plan) return;

      // Integração com Mercado Pago
      // Criar preferência de pagamento
      const response = await fetch('/api/payment/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
          price: plan.price,
          description: `Assinatura ${plan.name} - Assefin`,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar preferência de pagamento');
      }

      const { init_point } = await response.json();
      
      // Redirecionar para o checkout do Mercado Pago
      if (init_point) {
        window.location.href = init_point;
      } else {
        throw new Error('URL de pagamento não encontrada');
      }
    } catch (err) {
      console.error('Erro ao processar assinatura:', err);
      alert('Erro ao processar assinatura. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-16 overflow-visible">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">Escolha seu Plano</h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Acesso completo às ferramentas profissionais de análise de mercado e trading
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto" style={{ paddingTop: '2rem' }}>
          {PLANS.map((plan) => (
            <div key={plan.id} className="relative flex">
              {plan.popular && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-50">
                  <span className="bg-[var(--accent)] text-black px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-xl whitespace-nowrap inline-block">
                    Mais Popular
                  </span>
                </div>
              )}
              <div
                className={`modern-card p-8 rounded-2xl transition-all flex flex-col w-full ${
                  plan.popular
                    ? 'border-2 border-[var(--accent)] shadow-lg shadow-[var(--accent)]/20'
                    : 'border border-[var(--border)]'
                }`}
              >

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{plan.name}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-black text-[var(--text-primary)]">
                    R$ {plan.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[var(--text-muted)]">/mês</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, idx) => {
                  if (!feature) return <li key={idx} className="h-8" />;
                  return (
                    <li key={idx} className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm text-[var(--text-secondary)]">{feature}</span>
                    </li>
                  );
                })}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading && selectedPlan === plan.id}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  plan.popular
                    ? 'bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)] shadow-md'
                    : 'bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading && selectedPlan === plan.id ? 'Processando...' : 'Assinar Agora'}
              </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Todos os planos incluem garantia de 7 dias. Cancele quando quiser.
          </p>
        </div>
      </main>
    </div>
  );
}

