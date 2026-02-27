'use client';

import { useState, useCallback, useEffect } from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import Footer from '@/components/Footer';
import TradingChat from '@/components/TradingChat';
import BacktestChart, { BacktestResults } from '@/components/BacktestChart';
import AIKeysModal from '@/components/AIKeysModal';
import { BacktestStrategy } from '@/app/api/trading/backtest/route';

export default function TradingPage() {
  const [backtestResults, setBacktestResults] = useState<BacktestResults | null>(null);
  const [isRunningBacktest, setIsRunningBacktest] = useState(false);
  const [currentStrategyName, setCurrentStrategyName] = useState<string | undefined>();
  const [aiKeysOpen, setAiKeysOpen] = useState(false);
  const [keysConfigured, setKeysConfigured] = useState(false);

  // Check if at least one key is configured on mount
  useEffect(() => {
    fetch('/api/trading/keys')
      .then((r) => r.json())
      .then((data) => {
        setKeysConfigured(data.anthropic?.configured || data.gemini?.configured);
      })
      .catch(() => {});
  }, [aiKeysOpen]); // Re-check whenever modal closes

  const handleBacktestFound = useCallback(async (strategy: BacktestStrategy) => {
    setIsRunningBacktest(true);
    setCurrentStrategyName(strategy.name);

    try {
      const res = await fetch('/api/trading/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('Backtest error:', err.error);
        return;
      }

      const results: BacktestResults = await res.json();
      setBacktestResults(results);
    } catch (error) {
      console.error('Backtest fetch failed:', error);
    } finally {
      setIsRunningBacktest(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <MarketTickerBar />
      <AppHeader />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8 space-y-6">
        {/* Page Title */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[var(--accent-soft)] rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[var(--accent)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              A-Trading
            </h1>
            <p className="text-[var(--text-secondary)] text-sm ml-[52px]">
              Desenvolvimento de estratégias com IA · Backtest automático · Cripto &amp; Prediction Markets
            </p>
          </div>

          {/* Settings button */}
          <button
            onClick={() => setAiKeysOpen(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all flex-shrink-0 ${
              keysConfigured
                ? 'bg-[var(--success-soft)] border-[var(--success)]/30 text-[var(--success)] hover:bg-[var(--success)]/20'
                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {keysConfigured ? 'API Keys ✓' : 'Configurar Chaves de API'}
          </button>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 text-sm">
          <svg className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-semibold text-[var(--accent)]">Como funciona: </span>
            <span className="text-[var(--text-secondary)]">
              Descreva sua estratégia → A IA faz perguntas sobre backtest → Gera e executa o backtest automaticamente → Analise os resultados → Decida se prossegue para trading ao vivo.
            </span>
          </div>
        </div>

        {/* Main content: Chat + Backtest side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-6">
          {/* Chat — takes more space */}
          <div className="xl:col-span-3">
            <TradingChat
              onBacktestFound={handleBacktestFound}
              isRunningBacktest={isRunningBacktest}
              keysConfigured={keysConfigured}
              onOpenSettings={() => setAiKeysOpen(true)}
            />
          </div>

          {/* Backtest visualization */}
          <div className="xl:col-span-2">
            <BacktestChart
              results={backtestResults}
              loading={isRunningBacktest}
              strategyName={currentStrategyName}
            />
          </div>
        </div>

      </main>

      <Footer />

      <AIKeysModal open={aiKeysOpen} onClose={() => setAiKeysOpen(false)} />
    </div>
  );
}
