'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    produtos: [
      { label: 'Crypto', href: '/crypto' },
      { label: 'Ações', href: '/stocks' },
      { label: 'Markets', href: '/markets' },
      { label: 'Assinatura', href: '/subscription' },
    ],
    empresa: [
      { label: 'Sobre', href: '/about' },
      { label: 'Contato', href: '/contact' },
      { label: 'Blog', href: '/blog' },
      { label: 'Carreiras', href: '/careers' },
    ],
    legal: [
      { label: 'Termos de Uso', href: '/terms' },
      { label: 'Política de Privacidade', href: '/privacy' },
      { label: 'Cookies', href: '/cookies' },
    ],
    suporte: [
      { label: 'Central de Ajuda', href: '/help' },
      { label: 'Documentação', href: '/docs' },
      { label: 'Status', href: '/status' },
    ],
  };

  const socialLinks = [
    {
      name: 'Twitter',
      href: 'https://twitter.com/assefin',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/company/assefin',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      name: 'GitHub',
      href: 'https://github.com/assefin',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.465-1.11-1.465-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-elevated)]/50 backdrop-blur-sm mt-auto">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/crypto" className="inline-block mb-4 group">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="text-2xl font-black leading-none tracking-tight">
                    <span className="relative inline-block">
                      <span className="bg-gradient-to-r from-[var(--accent)] via-[var(--accent-strong)] to-[var(--accent)] bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
                        ASSEFIN
                      </span>
                    </span>
                  </div>
                  <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform scale-x-0 group-hover:scale-x-100 origin-center" />
                </div>
                <div className="text-[10px] font-bold text-[var(--text-muted)] leading-none uppercase tracking-[0.2em] opacity-70 group-hover:opacity-100 group-hover:text-[var(--accent)] transition-all duration-300">
                  MARKETS
                </div>
              </div>
            </Link>
            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm">
              Plataforma profissional para análise de mercados globais, criptomoedas e trading automatizado.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 hover:bg-[var(--surface-hover)] transition-all group"
                  aria-label={social.name}
                >
                  <span className="group-hover:scale-110 transition-transform duration-200">
                    {social.icon}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wider">
              Produtos
            </h3>
            <ul className="space-y-3">
              {footerLinks.produtos.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`text-sm transition-colors ${
                      pathname === link.href
                        ? 'text-[var(--accent)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wider">
              Empresa
            </h3>
            <ul className="space-y-3">
              {footerLinks.empresa.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`text-sm transition-colors ${
                      pathname === link.href
                        ? 'text-[var(--accent)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wider">
              Legal
            </h3>
            <ul className="space-y-3 mb-6">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`text-sm transition-colors ${
                      pathname === link.href
                        ? 'text-[var(--accent)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wider">
              Suporte
            </h3>
            <ul className="space-y-3">
              {footerLinks.suporte.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`text-sm transition-colors ${
                      pathname === link.href
                        ? 'text-[var(--accent)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            © {currentYear} ASSEFIN Markets. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[var(--success)] rounded-full animate-pulse" />
              Sistema operacional
            </span>
            <span className="hidden sm:inline">•</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}



