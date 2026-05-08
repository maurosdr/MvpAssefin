/* eslint-disable no-alert */
'use client';

import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PLANS } from '@/lib/plans';

export default function SubscriptionPage() {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const router = useRouter();

  const plan = PLANS[0];
  const plans: { id: string; name: string; price: string; bullets: string[]; featured?: boolean }[] = [
    {
      id: plan.id,
      name: plan.name,
      price: 'R$ 29,90/mês',
      bullets: plan.bullets,
      featured: true,
    },
  ];

  const handleSubscribe = async (plan: { id: string; name: string; price: string }) => {
    setSubmitting(plan.id);
    try {
      const res = await fetch('/api/payment/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          // preço/nome são validados no servidor (fonte de verdade)
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          const next = `/subscription?plan=${encodeURIComponent(plan.id)}`;
          router.push(`/login?mode=signup&next=${encodeURIComponent(next)}`);
          return;
        }
        alert(data?.error || 'Não foi possível iniciar o pagamento.');
        return;
      }
      const url = data?.url || data?.init_point;
      if (typeof url !== 'string' || !url) {
        alert('Checkout URL inválida.');
        return;
      }
      window.location.href = url;
    } catch {
      alert('Erro ao iniciar pagamento.');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center">
            <div className="section-title">assinatura</div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-[var(--text-primary)]">
              Assinatura
            </h1>
            <p className="mt-3 text-[var(--text-secondary)] max-w-2xl mx-auto">
              Um único plano, simples e direto — acesso total por um preço único.
            </p>
          </div>

          <div className="mt-10 grid md:grid-cols-1 gap-4 max-w-xl mx-auto">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`modern-card card-hover ${p.featured ? 'border-[var(--accent)] shadow-xl' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-extrabold text-[var(--text-primary)]">{p.name}</div>
                  {p.featured && (
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--text-inverse)] bg-[var(--accent)] px-2 py-1 rounded-full">
                      recomendado
                    </span>
                  )}
                </div>
                <div className="mt-3 text-2xl font-black data-value text-[var(--text-primary)]">{p.price}</div>

                <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleSubscribe(p)}
                  disabled={submitting === p.id}
                  className={`mt-6 inline-flex w-full justify-center items-center px-4 py-3 rounded-xl font-bold transition-colors ${
                    p.featured
                      ? 'bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)]'
                      : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                  } ${submitting === p.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {submitting === p.id ? 'Abrindo checkout…' : 'Assinar'}
                </button>

                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  Ao assinar, você concorda com os termos e a política de privacidade.
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

