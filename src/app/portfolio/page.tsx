'use client';

import { lazy, Suspense } from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';

const PortfolioChart = lazy(() => import('@/components/PortfolioChart'));
const PortfolioAllocation = lazy(() => import('@/components/PortfolioAllocation'));
const PortfolioRiskCard = lazy(() => import('@/components/PortfolioRiskCard'));
const PortfolioPositionsTable = lazy(() => import('@/components/PortfolioPositionsTable'));
const BinancePortfolio = lazy(() => import('@/components/BinancePortfolio'));

function LoadingSpinner() {
  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-8 flex items-center justify-center min-h-[200px]">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8 space-y-6">
        {/* Page Title */}
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            Portfolio
          </h1>
          <p className="text-[var(--text-secondary)] text-sm ml-[52px]">
            Consolidated view of your investments across all connected exchanges
          </p>
        </div>

        {/* Row 1: Portfolio Chart */}
        <Suspense fallback={<LoadingSpinner />}>
          <PortfolioChart />
        </Suspense>

        {/* Row 2: Allocation + Risk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<LoadingSpinner />}>
            <PortfolioAllocation />
          </Suspense>
          <Suspense fallback={<LoadingSpinner />}>
            <PortfolioRiskCard />
          </Suspense>
        </div>

        {/* Row 3: Positions Table */}
        <Suspense fallback={<LoadingSpinner />}>
          <PortfolioPositionsTable />
        </Suspense>

        {/* Row 4: Exchange Book (existing component) */}
        <Suspense fallback={<LoadingSpinner />}>
          <BinancePortfolio />
        </Suspense>
      </main>
    </div>
  );
}
