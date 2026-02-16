'use client';

import { useRouter, usePathname } from 'next/navigation';
import CryptoSearch from '@/components/CryptoSearch';
import BinanceLoginModal from '@/components/BinanceLoginModal';
import { useExchange } from '@/context/ExchangeContext';
import { useTheme } from '@/context/ThemeContext';
import { useState } from 'react';

interface SearchableCrypto {
  symbol: string;
  base: string;
  price: number;
}

export default function AppHeader({
  cryptos,
  children,
}: {
  cryptos?: SearchableCrypto[];
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { connectedExchanges } = useExchange();
  const { theme, toggleTheme } = useTheme();
  const connected = connectedExchanges.length > 0;
  const [showModal, setShowModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Crypto', path: '/crypto', icon: '📊' },
    { label: 'Ações', path: '/stocks', icon: '📈' },
    { label: 'News', path: '/news', icon: '📰' },
  ];

  return (
    <>
      <header className="fixed top-[40px] left-0 right-0 z-40 bg-[var(--bg-elevated)]/98 backdrop-blur-xl border-b border-[var(--border)] shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left Section: Logo + Navigation */}
            <div className="flex items-center gap-8 flex-1 min-w-0">
              {/* Logo */}
              <div
                className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
                onClick={() => router.push('/news')}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] rounded-xl flex items-center justify-center shadow-lg shadow-[var(--accent)]/30 group-hover:scale-105 transition-transform">
                    <svg className="w-7 h-7 text-[var(--text-inverse)]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--success)] rounded-full border-2 border-[var(--bg-elevated)] animate-pulse" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-xl font-bold text-[var(--text-primary)] leading-none tracking-tight">Assefin</div>
                  <div className="text-xs font-semibold text-[var(--text-muted)] leading-none mt-1 uppercase tracking-wider">Markets</div>
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
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
              {children && <div className="hidden md:block">{children}</div>}
            </div>

            {/* Center Section: Search */}
            <div className="hidden xl:block flex-1 max-w-xl mx-8">
              <CryptoSearch cryptos={cryptos} />
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Mobile Search Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-all lg:hidden"
                aria-label="Toggle search"
              >
                <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-all hover:scale-105 active:scale-95"
                aria-label="Toggle theme"
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

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
                <CryptoSearch cryptos={cryptos} />
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
            </div>
          )}
        </div>
      </header>

      <BinanceLoginModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
