'use client';

import { useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import StockIndicesChart from '@/components/StockIndicesChart';
import MacroIndicatorsCard from '@/components/MacroIndicatorsCard';
import VIXCard from '@/components/VIXCard';
import CurrencyTable from '@/components/CurrencyTable';
import YieldCurveChart from '@/components/YieldCurveChart';
import MacroNewsCard from '@/components/MacroNewsCard';
import BloombergNewsTicker from '@/components/BloombergNewsTicker';
import FearGreedIndex from '@/components/FearGreedIndex';
import PolymarketCards from '@/components/PolymarketCards';

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
    fetch('/api/news/macro')
      .then((r) => r.json())
      .then((data) => {
        if (data.articles && Array.isArray(data.articles)) {
          setArticles(data.articles);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const firstBatch = articles.slice(0, 6);
  const secondBatch = articles.slice(6, 10);

  return (
    <div className="min-h-screen bg-black">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            Global News & Markets
          </h1>
          <p className="text-gray-500 text-sm mt-1">
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
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Latest Headlines
            </h2>
            <MacroNewsCard articles={firstBatch} />
          </div>
        )}

        {/* Row 4: VIX + Fear & Greed + Currency Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-8">
            <VIXCard />
            <FearGreedIndex />
          </div>
          <div className="lg:col-span-2">
            <CurrencyTable />
          </div>
        </div>

        {/* Row 5: Polymarket Politics Predictions */}
        <PolymarketCards filterCategories={['politics']} />

        {/* Row 6: More news */}
        {!loading && secondBatch.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              More Stories
            </h2>
            <MacroNewsCard articles={secondBatch} />
          </div>
        )}

        {/* Row 5: US Yield Curve */}
        <YieldCurveChart />
      </main>
    </div>
  );
}
