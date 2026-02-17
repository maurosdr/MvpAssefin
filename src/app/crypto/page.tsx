'use client';

import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import TopCryptosTable from '@/components/TopCryptosTable';
import PriceChart from '@/components/PriceChart';
import FearGreedIndex from '@/components/FearGreedIndex';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import CryptoFeaturedNews from '@/components/CryptoFeaturedNews';
import MacroNewsCard from '@/components/MacroNewsCard';

// Lazy load componentes pesados
const BinancePortfolio = lazy(() => import('@/components/BinancePortfolio'));
const PolymarketCards = lazy(() => import('@/components/PolymarketCards'));

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

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'politics' | 'crypto' | 'economy';
  imageUrl?: string;
}

export default function CryptoDashboard() {
  const [cryptos, setCryptos] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [cryptoNews, setCryptoNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const fetchCryptos = async () => {
      try {
        const res = await fetch('/api/crypto', { 
          cache: 'no-store',
          next: { revalidate: 5 }
        });
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

  // Fetch crypto news - com delay para não bloquear renderização inicial
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news', {
          cache: 'no-store',
        });
        const data = await res.json();
        if (data.crypto && Array.isArray(data.crypto)) {
          // Mapear thumbnail para imageUrl
          const mappedNews = data.crypto.map((item: { thumbnail?: string | null; [key: string]: unknown }) => ({
            ...item,
            imageUrl: item.thumbnail || undefined,
          }));
          setCryptoNews(mappedNews);
        }
      } catch {
        // Error handling
      } finally {
        setNewsLoading(false);
      }
    };

    // Delay para não competir com outras chamadas no carregamento inicial
    const timeout = setTimeout(fetchNews, 500);
    // Atualiza a cada 10 minutos
    const interval = setInterval(fetchNews, 600000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader cryptos={cryptos}>
        {lastUpdate && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[var(--success-soft)] border border-[var(--success)]/20 rounded-lg">
            <span className="inline-block w-2 h-2 bg-[var(--success)] rounded-full animate-pulse" />
            <p className="text-xs font-medium text-[var(--success)]">
              Live updates every 5s
            </p>
          </div>
        )}
      </AppHeader>

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8 space-y-6">
        {/* Layout 50/50: Featured News (Left) + Table (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Featured News Card */}
          <div>
            <CryptoFeaturedNews />
          </div>

          {/* Right: Crypto Table */}
          <div>
            {loading ? (
              <div className="modern-card h-full min-h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-[var(--text-muted)]">Carregando dados...</p>
                </div>
              </div>
            ) : (
              <TopCryptosTable data={cryptos} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <PriceChart availableCryptos={cryptos.slice(0, 10)} />
          </div>
          <div>
            <FearGreedIndex />
          </div>
        </div>

        {/* Crypto News Cards - Mesmo layout da página News */}
        {!newsLoading && cryptoNews.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Crypto News
            </h2>
            <MacroNewsCard articles={cryptoNews.slice(0, 6)} />
          </div>
        )}

            <Suspense fallback={
              <div className="modern-card p-8 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <PolymarketCards />
            </Suspense>
            <Suspense fallback={
              <div className="modern-card p-8 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <BinancePortfolio />
            </Suspense>
      </main>
    </div>
  );
}
