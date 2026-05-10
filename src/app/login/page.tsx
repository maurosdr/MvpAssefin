'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupEmailSent, setSignupEmailSent] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendOk, setResendOk] = useState(false);

  useEffect(() => {
    // Redirecionar se já estiver logado
    if (status === 'authenticated' && session) {
      const next = searchParams.get('next');
      router.push(next && next.startsWith('/') ? next : '/crypto');
    }
  }, [status, session, router, searchParams]);

  useEffect(() => {
    // Verifica se há query param para abrir direto no modo cadastro
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setIsSignup(true);
    }
  }, [searchParams]);

  // Mostrar loading enquanto verifica sessão
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Carregando...</p>
        </div>
      </div>
    );
  }

  // Não renderizar se já estiver logado (será redirecionado)
  if (status === 'authenticated') {
    return null;
  }

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
      if (isSignup) {
        const registerResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            name: name || undefined,
            phone: phone || undefined,
            cpf: cpf || undefined,
          }),
        });

        const registerData = await registerResponse.json();

        if (!registerResponse.ok) {
          setError(registerData.error || 'Erro ao criar conta. Tente novamente.');
          return;
        }

        setSignupEmail(registerData.user?.email || email);
        setSignupEmailSent(true);
        setPassword('');
        setConfirmPassword('');
        return;
      } else {
        // Fazer login
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          if (result.code === 'email_unverified') {
            setError(
              'Confirme seu e-mail antes de entrar. Verifique a caixa de entrada e o spam.'
            );
            return;
          }
          setError('Email ou senha incorretos.');
          return;
        }

        const next = searchParams.get('next');
        router.push(next && next.startsWith('/') ? next : '/crypto');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(isSignup ? 'Erro ao criar conta. Tente novamente.' : 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const target = (signupEmail || email).trim();
    if (!target) {
      setError('Informe seu e-mail para reenviar o link.');
      return;
    }
    setResendLoading(true);
    setError('');
    setResendOk(false);
    try {
      const r = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Não foi possível reenviar.');
        return;
      }
      setResendOk(true);
    } catch {
      setError('Não foi possível reenviar. Tente novamente.');
    } finally {
      setResendLoading(false);
    }
  };

  const verifiedNotice = searchParams.get('verified');
  const verifyNotice = searchParams.get('verify');

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8">
        <div className="max-w-md mx-auto">
          <div className="modern-card p-8">
            {verifiedNotice === '1' && (
              <div className="mb-6 rounded-xl border border-[var(--success)]/30 bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--text-primary)]">
                E-mail confirmado. Você já pode entrar com sua senha.
              </div>
            )}
            {verifyNotice === 'expired' && (
              <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                Este link de confirmação expirou ou já foi usado. Solicite um novo e-mail abaixo ou faça o cadastro
                novamente.
              </div>
            )}
            {verifyNotice === 'invalid' && (
              <div className="mb-6 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                Link inválido. Use o botão no e-mail ou peça um novo link.
              </div>
            )}

            {signupEmailSent ? (
              <div className="space-y-6">
                <div className="text-center mb-2">
                  <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Confira seu e-mail</h1>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed px-1">
                    Enviamos um link para{' '}
                    <strong className="text-[var(--text-primary)]">{signupEmail}</strong>. Abra a mensagem e clique em{' '}
                    <strong className="text-[var(--text-primary)]">Confirmar e-mail</strong> para ativar sua conta (validade
                    de 24 horas).
                  </p>
                </div>
                {resendOk && (
                  <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--text-primary)]">
                    Se existir conta pendente neste e-mail, um novo link foi enviado.
                  </div>
                )}
                {error && (
                  <div className="bg-[var(--danger-soft)] border border-[var(--danger)]/30 rounded-xl p-3">
                    <p className="text-sm text-[var(--danger)]">{error}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="w-full bg-[var(--accent)] text-[var(--text-inverse)] font-bold py-3 rounded-xl hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendLoading ? 'Enviando…' : 'Reenviar e-mail de confirmação'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSignupEmailSent(false);
                    setResendOk(false);
                    setIsSignup(false);
                    setError('');
                  }}
                  className="w-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] font-semibold py-3 rounded-xl hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Ir para Entrar
                </button>
              </div>
            ) : (
              <>
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
                  setPhone('');
                  setCpf('');
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
                  setPhone('');
                  setCpf('');
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
                {isSignup ? 'Comece sua jornada no Assefin Markets' : 'Acesse sua conta Assefin Markets'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignup && (
                <>
                  {/* Nome Completo - Largura completa */}
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

                  {/* CPF e Celular - Duas colunas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="cpf" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                        CPF
                      </label>
                      <input
                        id="cpf"
                        type="text"
                        value={cpf}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 11) {
                            // Formatar CPF: 000.000.000-00
                            if (value.length > 9) {
                              value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, '$1.$2.$3-$4');
                            } else if (value.length > 6) {
                              value = value.replace(/^(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
                            } else if (value.length > 3) {
                              value = value.replace(/^(\d{3})(\d{0,3})/, '$1.$2');
                            }
                            setCpf(value);
                          }
                        }}
                        required
                        maxLength={14}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                        placeholder="000.000.000-00"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                        Celular
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 15) {
                            // Formatar telefone: (00) 00000-0000 ou (00) 0000-0000
                            if (value.length > 10) {
                              value = value.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
                            } else if (value.length > 6) {
                              value = value.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
                            } else if (value.length > 2) {
                              value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
                            } else {
                              value = value.replace(/^(\d{0,2})/, value.length > 0 ? '($1' : '');
                            }
                            setPhone(value);
                          }
                        }}
                        required
                        maxLength={15}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email - Largura completa */}
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

              {/* Senha e Confirmar Senha - Duas colunas no cadastro, uma coluna no login */}
              {isSignup ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              ) : (
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
              )}

              {error && (
                <div className="bg-[var(--danger-soft)] border border-[var(--danger)]/30 rounded-xl p-3 space-y-3">
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                  {!isSignup && error.includes('Confirme seu e-mail') && (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendLoading}
                      className="text-sm font-semibold text-[var(--accent)] underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      Reenviar link de confirmação
                    </button>
                  )}
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
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[var(--text-secondary)]">Carregando...</p>
          </div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

