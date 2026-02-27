'use client';

import { useState, useCallback } from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import Footer from '@/components/Footer';
import TradingChat from '@/components/TradingChat';
import BacktestChart, { BacktestResults } from '@/components/BacktestChart';
import { BacktestStrategy } from '@/app/api/trading/backtest/route';

export default function TradingPage() {
  const [backtestResults, setBacktestResults] = useState<BacktestResults | null>(null);
  const [isRunningBacktest, setIsRunningBacktest] = useState(false);
  const [currentStrategyName, setCurrentStrategyName] = useState<string | undefined>();

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
        <div className="mb-2">
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
            Desenvolvimento de estratégias de trading com IA · Backtest automático · Cripto &amp; Prediction Markets
          </p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 text-sm">
          <svg className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-semibold text-[var(--accent)]">Como funciona: </span>
            <span className="text-[var(--text-secondary)]">
              Descreva sua estratégia de trading → A IA faz perguntas para entender sua estratégia → Gera e executa o backtest automaticamente → Analise os resultados e decida se quer prosseguir para trading ao vivo.
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

        {/* Features row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: '🔬',
              title: 'Backtest com Dados Reais',
              description: 'A estratégia é testada com dados históricos reais via BRAPI API ou Binance (CCXT), sem dados sintéticos.',
            },
            {
              icon: '🔑',
              title: 'Integração com Corretoras',
              description: 'Conecte Binance, Coinbase, Polymarket e Kalshi para trading ao vivo após validar sua estratégia.',
            },
            {
              icon: '🛡️',
              title: 'Constituição de IA',
              description: 'A IA segue regras rígidas: sempre valida com backtest antes de implementar, e confirma cada etapa com você.',
            },
          ].map((feature) => (
            <div key={feature.title} className="modern-card p-5 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-xl flex-shrink-0">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">{feature.title}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
