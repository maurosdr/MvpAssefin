'use client';

import { useEffect, useState, useRef } from 'react';
import TopCryptosTable from '@/components/TopCryptosTable';
import PriceChart from '@/components/PriceChart';
import FearGreedIndex from '@/components/FearGreedIndex';
import BinancePortfolio from '@/components/BinancePortfolio';
import PolymarketCards from '@/components/PolymarketCards';
import NewsSection from '@/components/NewsSection';
import AppHeader from '@/components/AppHeader';

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
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
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
    const interval = setInterval(fetchCryptos, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <AppHeader cryptos={cryptos}>
        {lastUpdate && (
          <div className="hidden sm:block">
            <p className="text-xs text-gray-500">
              Live <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse ml-1 mr-1" />
              updates every 5s
            </p>
          </div>
        )}
      </AppHeader>

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
            <TopCryptosTable data={cryptos} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <PriceChart availableCryptos={cryptos.slice(0, 10)} />
              </div>
              <div>
                <FearGreedIndex />
              </div>
            </div>

            <NewsSection />
            <PolymarketCards />
            <BinancePortfolio />
          </>
        )}
      </main>
    </div>
  );
}
