'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import AssetSearch from '@/components/AssetSearch';
import BinanceLoginModal from '@/components/BinanceLoginModal';
import { useExchange } from '@/context/ExchangeContext';
import { useTheme } from '@/context/ThemeContext';
import { useState, useRef, useEffect } from 'react';

interface SearchableCrypto {
  symbol: string;
  base: string;
  price: number;
}

interface SearchableStock {
  symbol: string;
  name: string;
  price: number;
}

export default function AppHeader({
  cryptos,
  stocks,
  children,
}: {
  cryptos?: SearchableCrypto[];
  stocks?: SearchableStock[];
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { connectedExchanges } = useExchange();
  const { theme, toggleTheme } = useTheme();
  const connected = connectedExchanges.length > 0;
  const [showModal, setShowModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const navItems = [
    { label: 'Crypto', path: '/crypto', icon: '📊' },
    { label: 'Ações', path: '/stocks', icon: '📈' },
    { label: 'Markets', path: '/markets', icon: '📰' },
  ];

  return (
    <>
      <header className="absolute top-[40px] left-0 right-0 z-[45] bg-[var(--bg-elevated)]/98 backdrop-blur-xl border-b border-[var(--border)] shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-2 sm:gap-4">
            {/* Left Section: Logo + Navigation */}
            <div className="flex items-center gap-4 sm:gap-6 lg:gap-8 flex-1 min-w-0 overflow-hidden">
              {/* Logo */}
              <div
                className="flex items-center gap-2 sm:gap-3 cursor-pointer group flex-shrink-0 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => router.push('/crypto')}
              >
                <div className="hidden sm:block">
                  <div className="relative">
                    <div className="text-xl sm:text-2xl font-black leading-none tracking-tight">
                      <span className="relative inline-block">
                        <span className="bg-gradient-to-r from-[var(--accent)] via-[var(--accent-strong)] to-[var(--accent)] bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
                          ASSEFIN
                        </span>
                        <span className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] via-[var(--accent-strong)] to-[var(--accent)] bg-clip-text text-transparent opacity-0 group-hover:opacity-30 blur-[2px] transition-opacity duration-500">
                          ASSEFIN
                        </span>
                      </span>
                    </div>
                    <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform scale-x-0 group-hover:scale-x-100 origin-center" />
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-bold text-[var(--text-muted)] leading-none mt-1.5 sm:mt-2 uppercase tracking-[0.2em] opacity-70 group-hover:opacity-100 group-hover:text-[var(--accent)] transition-all duration-300">
                    MARKETS
                  </div>
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden xl:flex items-center gap-1 flex-shrink-0">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => router.push(item.path)}
                      className={`relative px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? 'text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="relative z-10">{item.label}</span>
                      {isActive && (
                        <>
                          <div className="absolute inset-0 bg-[var(--accent-soft)] rounded-lg" />
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--accent)] rounded-full" />
                        </>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Children (like live indicator) */}
              {children && <div className="hidden lg:block flex-shrink-0">{children}</div>}
            </div>

            {/* Center Section: Search */}
            <div className="hidden 2xl:block flex-1 max-w-xl mx-4 xl:mx-8 min-w-0">
              <AssetSearch cryptos={cryptos} stocks={stocks} />
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Mobile Search Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="2xl:hidden p-2 sm:p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-all"
                aria-label="Toggle search"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 sm:p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-all hover:scale-105 active:scale-95"
                aria-label="Toggle theme"
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* User Menu or Login/Signup Buttons */}
              {status === 'loading' ? (
                <div className="hidden lg:flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] animate-pulse" />
                </div>
              ) : session?.user ? (
                <div className="hidden lg:block relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--surface-hover)] transition-all group"
                  >
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] flex items-center justify-center text-sm font-bold text-[var(--text-inverse)] shadow-lg">
                        {getInitials(session.user.name, session.user.email)}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--success)] rounded-full border-2 border-[var(--bg-elevated)]"></div>
                    </div>
                    <div className="text-left hidden 2xl:block min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-primary)] leading-tight truncate max-w-[120px]">
                        {session.user.name || session.user.email?.split('@')[0]}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] leading-tight truncate max-w-[120px]">
                        {session.user.email}
                      </div>
                    </div>
                    <svg
                      className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 z-50">
                      <div className="p-4 border-b border-[var(--border)]">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] flex items-center justify-center text-lg font-bold text-[var(--text-inverse)] shadow-lg">
                            {getInitials(session.user.name, session.user.email)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                              {session.user.name || 'Usuário'}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] truncate">
                              {session.user.email}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-2">
                        <button
                          onClick={() => {
                            router.push('/subscription');
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all text-left"
                        >
                          <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                          <span>Assinatura</span>
                        </button>

                        <button
                          onClick={() => {
                            router.push('/profile');
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all text-left"
                        >
                          <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Perfil</span>
                        </button>

                        <div className="h-px bg-[var(--border)] my-2" />

                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-all text-left"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Sair</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden lg:flex items-center gap-2">
                  <button
                    onClick={() => router.push('/login')}
                    className="px-4 py-2.5 rounded-lg font-semibold text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => router.push('/subscription')}
                    className="px-4 py-2.5 rounded-lg font-semibold text-sm bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)] transition-all shadow-sm"
                  >
                    Assinatura
                  </button>
                </div>
              )}

              {/* Connect Button */}
              <button
                onClick={() => setShowModal(true)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all whitespace-nowrap border ${
                  connected
                    ? 'bg-[var(--success-soft)] text-[var(--success)] border-[var(--success)]/30 hover:bg-[var(--success-soft)] hover:border-[var(--success)]/50'
                    : 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/30 hover:bg-[var(--accent-soft)] hover:border-[var(--accent)]/50'
                } active:scale-95 shadow-sm`}
              >
                {connected ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="hidden sm:inline">{connectedExchanges.length}/2 Connected</span>
                    <span className="sm:hidden">{connectedExchanges.length}/2</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L6.5 7.5 12 13l5.5-5.5L12 2zm0 22l5.5-5.5L12 13l-5.5 5.5L12 24zm-10-10l5.5 5.5L13 12 7.5 6.5 2 12zm20 0l-5.5-5.5L11 12l5.5 5.5L22 12z" />
                    </svg>
                    <span className="hidden sm:inline">Connect Exchange</span>
                    <span className="sm:hidden">Connect</span>
                  </>
                )}
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-all"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-[var(--border)] py-4 space-y-3 animate-in slide-in-from-top">
              {/* Mobile Search */}
              <div className="px-2">
                <AssetSearch cryptos={cryptos} stocks={stocks} />
              </div>

              {/* Mobile Navigation */}
              <nav className="flex flex-col gap-1 px-2">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        router.push(item.path);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Mobile Children */}
              {children && <div className="px-2">{children}</div>}

              {/* Mobile Auth Links */}
              {session?.user ? (
                <div className="px-2 space-y-2 border-t border-[var(--border)] pt-4 mt-4">
                  <div className="px-4 py-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] mb-2">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] flex items-center justify-center text-sm font-bold text-[var(--text-inverse)] shadow-lg">
                          {getInitials(session.user.name, session.user.email)}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--success)] rounded-full border-2 border-[var(--surface)]"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {session.user.name || 'Usuário'}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] truncate">
                          {session.user.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      router.push('/subscription');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all"
                  >
                    <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <span>Assinatura</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/profile');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all"
                  >
                    <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Perfil</span>
                  </button>

                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sair</span>
                  </button>
                </div>
              ) : (
                <div className="px-2 space-y-2 border-t border-[var(--border)] pt-4 mt-4">
                  <button
                    onClick={() => {
                      router.push('/login');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Entrar</span>
                  </button>
                  <button
                    onClick={() => {
                      router.push('/subscription');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)] transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <span>Assinatura</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <BinanceLoginModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
