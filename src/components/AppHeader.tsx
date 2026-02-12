'use client';

import { useRouter, usePathname } from 'next/navigation';
import CryptoSearch from '@/components/CryptoSearch';
import BinanceLoginModal from '@/components/BinanceLoginModal';
import { useExchange } from '@/context/ExchangeContext';
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
  const connected = connectedExchanges.length > 0;
  const [showModal, setShowModal] = useState(false);

  const activeNav = pathname.startsWith('/crypto') ? 'crypto' : 'news';

  return (
    <>
      <header className="border-b border-gray-800 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div
                className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center cursor-pointer"
                onClick={() => router.push('/news')}
              >
                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
                </svg>
              </div>

              {/* Nav buttons */}
              <nav className="hidden sm:flex items-center gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-1">
                <button
                  onClick={() => router.push('/crypto')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeNav === 'crypto'
                      ? 'bg-yellow-500 text-black'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  Crypto
                </button>
                <button
                  onClick={() => router.push('/news')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeNav === 'news'
                      ? 'bg-yellow-500 text-black'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  News
                </button>
              </nav>

              {children}
            </div>

            <div className="flex items-center gap-3 flex-1 justify-end">
              <CryptoSearch cryptos={cryptos} />

              <button
                onClick={() => setShowModal(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors whitespace-nowrap ${
                  connected
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L6.5 7.5 12 13l5.5-5.5L12 2zm0 22l5.5-5.5L12 13l-5.5 5.5L12 24zm-10-10l5.5 5.5L13 12 7.5 6.5 2 12zm20 0l-5.5-5.5L11 12l5.5 5.5L22 12z" />
                </svg>
                {connected
                  ? `${connectedExchanges.length}/2`
                  : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <BinanceLoginModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
