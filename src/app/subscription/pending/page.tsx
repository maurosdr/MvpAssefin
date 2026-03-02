'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';

export default function SubscriptionPendingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');

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
            <div className="w-20 h-20 bg-[var(--accent-soft)] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-[var(--accent)] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              Pagamento Pendente
            </h1>
            <p className="text-lg text-[var(--text-secondary)] mb-6">
              Seu pagamento do plano <strong className="text-[var(--accent)]">
                {planId ? planNames[planId] || planId : 'Premium'}
              </strong> está sendo processado.
            </p>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Você receberá um email assim que o pagamento for confirmado. Isso pode levar alguns minutos.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => router.push('/subscription')}
                className="w-full bg-[var(--accent)] text-[var(--text-inverse)] font-bold py-3 rounded-xl hover:bg-[var(--accent-hover)] transition-all"
              >
                Ver Status da Assinatura
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



