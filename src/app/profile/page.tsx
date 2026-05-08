'use client';

import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

function maskEmail(email?: string | null) {
  if (!email) return '—';
  const [u, d] = email.split('@');
  if (!u || !d) return email;
  const keep = Math.min(2, u.length);
  return `${u.slice(0, keep)}***@${d}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    router.push(`/login?next=${encodeURIComponent('/profile')}`);
    return null;
  }

  const user = session.user;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-16">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="section-title">perfil</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">
                Sua conta
              </h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Informações básicas e acesso rápido à assinatura.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push('/subscription')}
                className="px-4 py-2.5 rounded-xl font-bold text-sm bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)] transition-colors"
              >
                Assinatura
              </button>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-4 py-2.5 rounded-xl font-bold text-sm bg-[var(--surface)] border border-[var(--border)] text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
              >
                Sair
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-4">
            <div className="md:col-span-7 modern-card">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] border border-[var(--border)] flex items-center justify-center text-lg font-black text-[var(--text-primary)]">
                  {(user.name?.trim()?.[0] || user.email?.trim()?.[0] || 'U').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-extrabold text-[var(--text-primary)] truncate">
                    {user.name || 'Usuário'}
                  </div>
                  <div className="mt-0.5 text-sm text-[var(--text-secondary)] truncate">
                    {user.email || '—'}
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        id
                      </div>
                      <div className="mt-1 text-sm font-bold data-value text-[var(--text-primary)] break-all">
                        {user.id || '—'}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        email (masked)
                      </div>
                      <div className="mt-1 text-sm font-bold data-value text-[var(--text-primary)] break-all">
                        {maskEmail(user.email)}
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-[var(--text-muted)]">
                    Em breve: edição de dados, chaves e preferências diretamente por aqui.
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 modern-card">
              <div className="section-title">segurança</div>
              <h2 className="mt-2 text-lg font-extrabold text-[var(--text-primary)]">
                Boas práticas
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span>Não compartilhe suas chaves de API fora do sistema.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span>Use senha forte e única (recomendado: gerenciador de senhas).</span>
                </li>
              </ul>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/crypto')}
                  className="w-full px-4 py-3 rounded-xl font-bold bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Voltar ao dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

