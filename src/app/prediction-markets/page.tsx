'use client';

import { lazy, Suspense } from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';

const PredictionMarketComparison = lazy(() => import('@/components/PredictionMarketComparison'));
const KalshiTrump = lazy(() => import('@/components/KalshiTrump'));
const PolymarketMarkets = lazy(() => import('@/components/PolymarketMarkets'));
const PolymarketBrazilTable = lazy(() => import('@/components/PolymarketBrazilTable'));

function LoadingSpinner() {
  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-8 flex items-center justify-center min-h-[200px]">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function PredictionMarketsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8 space-y-6">
        {/* Page Title */}
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            Prediction Markets
          </h1>
          <p className="text-[var(--text-secondary)] text-sm ml-[52px]">
            Compare prediction markets across Kalshi and Polymarket in real-time
          </p>
        </div>

        {/* Row 1: Side-by-side comparison */}
        <Suspense fallback={<LoadingSpinner />}>
          <PredictionMarketComparison />
        </Suspense>

        {/* Row 2: Detailed views side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<LoadingSpinner />}>
            <KalshiTrump />
          </Suspense>
          <Suspense fallback={<LoadingSpinner />}>
            <PolymarketMarkets />
          </Suspense>
        </div>

        {/* Row 3: Polymarket Brazil */}
        <Suspense fallback={<LoadingSpinner />}>
          <PolymarketBrazilTable />
        </Suspense>
      </main>
    </div>
  );
}
