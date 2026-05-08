'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';

export default function SubscriptionFailurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-16">
        <div className="max-w-2xl mx-auto">
          <div className="modern-card p-8 text-center">
            <div className="w-20 h-20 bg-[var(--danger)] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              Pagamento Não Aprovado
            </h1>
            <p className="text-lg text-[var(--text-secondary)] mb-6">
              Não foi possível processar seu pagamento. Por favor, tente novamente ou entre em contato com o suporte.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => router.push('/subscription')}
                className="w-full bg-[var(--accent)] text-[var(--text-inverse)] font-bold py-3 rounded-xl hover:bg-[var(--accent-hover)] transition-all"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => router.push('/crypto')}
                className="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-semibold py-3 rounded-xl hover:bg-[var(--surface-hover)] transition-all"
              >
                Voltar ao Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}



