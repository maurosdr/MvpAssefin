'use client';

import { useEffect, useState, useRef } from 'react';
import CryptoSearch from '@/components/CryptoSearch';
import TopCryptosTable from '@/components/TopCryptosTable';
import PriceChart from '@/components/PriceChart';
import FearGreedIndex from '@/components/FearGreedIndex';
import BinancePortfolio from '@/components/BinancePortfolio';
import BinanceLoginModal from '@/components/BinanceLoginModal';
import PolymarketCards from '@/components/PolymarketCards';
import NewsSection from '@/components/NewsSection';
import { useExchange } from '@/context/ExchangeContext';

interface CryptoData {
  symbol: string;
  base: string;
  price: number;
  coinbasePrice: number | null;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

export default function Home() {
  const [cryptos, setCryptos] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBinanceModal, setShowBinanceModal] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { connectedExchanges } = useExchange();
  const connected = connectedExchanges.length > 0;
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const fetchCryptos = async () => {
      try {
        const res = await fetch('/api/crypto');
        const data = await res.json();
        if (Array.isArray(data)) {
          setCryptos(data);
          setLastUpdate(new Date());
        }
      } catch {
        // API fetch failed
      } finally {
        if (isFirstLoad.current) {
          setLoading(false);
          isFirstLoad.current = false;
        }
      }
    };

    fetchCryptos();
    // Update tables every 5 seconds
    const interval = setInterval(fetchCryptos, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-white">Crypto Dashboard</h1>
                {lastUpdate && (
                  <p className="text-xs text-gray-500">
                    Live <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse ml-1 mr-1" />
                    updates every 5s
                  </p>
                )}
              </div>
            </div>

            <CryptoSearch cryptos={cryptos} />

            <button
              onClick={() => setShowBinanceModal(true)}
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
                ? `${connectedExchanges.length}/2 Connected`
                : 'Connect Exchange'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading live data from Binance & Coinbase...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Top 10 Cryptos Table */}
            <TopCryptosTable data={cryptos} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <PriceChart availableCryptos={cryptos.slice(0, 10)} />
              </div>
              <div>
                <FearGreedIndex />
              </div>
            </div>

            {/* Latest News */}
            <NewsSection />

            {/* Polymarket Predictions by Category */}
            <PolymarketCards />

            {/* Binance Portfolio */}
            <BinancePortfolio />
          </>
        )}
      </main>

      {/* Binance Login Modal */}
      <BinanceLoginModal open={showBinanceModal} onClose={() => setShowBinanceModal(false)} />
    </div>
  );
}
