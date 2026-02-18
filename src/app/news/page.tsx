'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import StockIndicesChart from '@/components/StockIndicesChart';
import MacroIndicatorsCard from '@/components/MacroIndicatorsCard';
import VIXCard from '@/components/VIXCard';
import CurrencyTable from '@/components/CurrencyTable';
import MacroNewsCard from '@/components/MacroNewsCard';
import BloombergNewsTicker from '@/components/BloombergNewsTicker';

// Lazy load componentes pesados
const YieldCurveChart = lazy(() => import('@/components/YieldCurveChart'));
const PolymarketCards = lazy(() => import('@/components/PolymarketCards'));
const FocusCard = lazy(() => import('@/components/FocusCard'));

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'politics' | 'economy';
  imageUrl?: string;
}

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news/macro', { cache: 'no-store' });
        const data = await res.json();
        if (data.articles && Array.isArray(data.articles)) {
          setArticles(data.articles);
        }
      } catch {
        // Error handling
      } finally {
        setLoading(false);
      }
    };
    
    fetchNews();
  }, []);

  const firstBatch = articles.slice(0, 6);
  const secondBatch = articles.slice(6, 10);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8 space-y-6">
        {/* Page Title */}
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--accent-soft)] rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            Global News & Markets
          </h1>
          <p className="text-[var(--text-secondary)] text-sm ml-[52px]">
            Politics, Economy, and Financial Markets Overview
          </p>
        </div>

        {/* Row 1: Stock Indices Chart + Macro Indicators */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <StockIndicesChart />
          </div>
          <div>
            <MacroIndicatorsCard />
          </div>
        </div>

        {/* Row 2: Bloomberg-style News Wire */}
        <BloombergNewsTicker />

        {/* Row 3: First batch of news */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-[var(--text)] mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Latest Headlines
            </h2>
            <MacroNewsCard articles={firstBatch} />
          </div>
        )}

        {/* Row 3: VIX + Currency Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <VIXCard />
          </div>
          <div className="lg:col-span-2">
            <CurrencyTable />
          </div>
        </div>

        {/* Row 5: Polymarket Politics Predictions */}
        <Suspense fallback={
          <div className="modern-card p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <PolymarketCards filterCategories={['politics']} />
        </Suspense>

        {/* Row 6: More news */}
        {!loading && secondBatch.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-[var(--text)] mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              More Stories
            </h2>
            <MacroNewsCard articles={secondBatch} />
          </div>
        )}

        {/* Row 7: Yield Curve + Focus (BCB) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Suspense fallback={
              <div className="modern-card p-8 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <YieldCurveChart />
            </Suspense>
          </div>
          <div>
            <Suspense fallback={
              <div className="modern-card p-8 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <FocusCard />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
