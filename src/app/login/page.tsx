'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verifica se há query param para abrir direto no modo cadastro
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setIsSignup(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignup) {
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        return;
      }

      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
    }

    setLoading(true);

    try {
      // TODO: Implementar autenticação real
      // Por enquanto, apenas simula login/cadastro
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirecionar após login/cadastro bem-sucedido
      router.push('/crypto');
    } catch (err) {
      setError(isSignup ? 'Erro ao criar conta. Tente novamente.' : 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8">
        <div className="max-w-md mx-auto">
          <div className="modern-card p-8">
            {/* Toggle Buttons */}
            <div className="flex gap-2 mb-8 bg-[var(--surface)] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setIsSignup(false);
                  setError('');
                  setName('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  !isSignup
                    ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignup(true);
                  setError('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  isSignup
                    ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Cadastrar
              </button>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                {isSignup ? 'Criar Conta' : 'Entrar'}
              </h1>
              <p className="text-[var(--text-secondary)]">
                {isSignup ? 'Comece sua jornada no Assefin' : 'Acesse sua conta Assefin'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignup && (
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                    Nome Completo
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                    placeholder="Seu nome completo"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>

              {isSignup && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                    Confirmar Senha
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
              )}

              {error && (
                <div className="bg-[var(--danger-soft)] border border-[var(--danger)]/30 rounded-xl p-3">
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--accent)] text-[var(--text-inverse)] font-bold py-3 rounded-xl hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (isSignup ? 'Criando conta...' : 'Entrando...') : (isSignup ? 'Criar Conta' : 'Entrar')}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

