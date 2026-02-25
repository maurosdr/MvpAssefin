'use client';

import { lazy, Suspense } from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';

const FixedIncomeCalculator = lazy(() => import('@/components/FixedIncomeCalculator'));
const HistoricalYieldCurveChart = lazy(() => import('@/components/HistoricalYieldCurveChart'));
const YieldCurveChart = lazy(() => import('@/components/YieldCurveChart'));

function LoadingSpinner() {
  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-8 flex items-center justify-center min-h-[300px]">
      <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function RendaFixaPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8 space-y-6">
        {/* Page Title */}
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Renda Fixa
          </h1>
          <p className="text-[var(--text-secondary)] text-sm ml-[52px]">
            Calculadora de investimentos, curva de juros e simulador de Tesouro Direto
          </p>
        </div>

        {/* Row 1: Fixed Income Calculator */}
        <Suspense fallback={<LoadingSpinner />}>
          <FixedIncomeCalculator />
        </Suspense>

        {/* Row 2: Current Yield Curve */}
        <Suspense fallback={<LoadingSpinner />}>
          <YieldCurveChart />
        </Suspense>

        {/* Row 3: Historical Yield Curve Comparison */}
        <Suspense fallback={<LoadingSpinner />}>
          <HistoricalYieldCurveChart />
        </Suspense>
      </main>
    </div>
  );
}
