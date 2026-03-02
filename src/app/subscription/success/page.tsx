'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aguardar um pouco para garantir que o webhook processou
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const planNames: Record<string, string> = {
    basic: 'Básico',
    pro: 'Pro',
    premium: 'Premium',
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-16">
        <div className="max-w-2xl mx-auto">
          <div className="modern-card p-8 text-center">
            {loading ? (
              <>
                <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
                  Processando pagamento...
                </h1>
                <p className="text-[var(--text-secondary)]">
                  Aguarde enquanto confirmamos seu pagamento.
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-[var(--success)] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
                  Pagamento Aprovado!
                </h1>
                <p className="text-lg text-[var(--text-secondary)] mb-6">
                  Sua assinatura do plano <strong className="text-[var(--accent)]">
                    {planId ? planNames[planId] || planId : 'Premium'}
                  </strong> foi ativada com sucesso!
                </p>
                <div className="space-y-4">
                  <button
                    onClick={() => router.push('/subscription')}
                    className="w-full bg-[var(--accent)] text-[var(--text-inverse)] font-bold py-3 rounded-xl hover:bg-[var(--accent-hover)] transition-all"
                  >
                    Ver Minha Assinatura
                  </button>
                  <button
                    onClick={() => router.push('/crypto')}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-semibold py-3 rounded-xl hover:bg-[var(--surface-hover)] transition-all"
                  >
                    Ir para Dashboard
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}



