'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PortfolioChartPosition, ManualPosition } from '@/types/portfolio';
import {
  calculateSimpleReturns,
  calculateCorrelationMatrix,
  generateEfficientFrontier,
  calculateBrinsonAttribution,
  calculateReturnContributions,
  EfficientFrontierPoint,
  CorrelationResult,
  BrinsonItem,
  WaterfallItem,
} from '@/lib/portfolio-calculations';
import EfficientFrontierChart from './EfficientFrontierChart';
import CorrelationMatrix from './CorrelationMatrix';
import BrinsonAttributionChart from './BrinsonAttributionChart';
import ReturnWaterfallChart from './ReturnWaterfallChart';

type AnalysisWindow = '1mo' | '3mo' | '6mo' | '1y' | '2y';

interface Props {
  positions: PortfolioChartPosition[];
  manualPositions: ManualPosition[];
  cryptoSymbols: string[];
}

interface AnalyticsData {
  frontier: EfficientFrontierPoint[];
  correlation: CorrelationResult;
  brinson: BrinsonItem[];
  waterfall: WaterfallItem[];
}

const WINDOW_LABELS: Record<AnalysisWindow, string> = {
  '1mo': '1 Mês',
  '3mo': '3 Meses',
  '6mo': '6 Meses',
  '1y': '1 Ano',
  '2y': '2 Anos',
};

export default function AdvancedIndicatorsTab({ positions, manualPositions, cryptoSymbols }: Props) {
  const [window, setWindow] = useState<AnalysisWindow>('1y');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const positionsRef = useRef(positions);
  const manualRef = useRef(manualPositions);
  const cryptoRef = useRef(cryptoSymbols);

  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => { manualRef.current = manualPositions; }, [manualPositions]);
  useEffect(() => { cryptoRef.current = cryptoSymbols; }, [cryptoSymbols]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const compute = useCallback(async (range: AnalysisWindow) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const curPositions = positionsRef.current;
    const curManual = manualRef.current;
    const curCrypto = cryptoRef.current;

    // Build symbols / types arrays (skip prediction)
    const allSymbols: string[] = [];
    const allTypes: string[] = [];

    for (const p of curManual) {
      if (p.type !== 'prediction') {
        allSymbols.push(p.symbol);
        allTypes.push(p.type);
      }
    }
    for (const sym of curCrypto) {
      if (!allSymbols.includes(sym)) {
        allSymbols.push(sym);
        allTypes.push('crypto');
      }
    }

    if (allSymbols.length < 2) {
      setAnalytics({
        frontier: [],
        correlation: { labels: [], matrix: [] },
        brinson: [],
        waterfall: [],
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        symbols: allSymbols.join(','),
        types: allTypes.join(','),
        range,
      });

      const res = await fetch(`/api/portfolio/historical?${params}`, {
        signal: ctrl.signal,
      });

      if (ctrl.signal.aborted) return;
      if (!res.ok) {
        setError('Falha ao carregar dados históricos');
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (ctrl.signal.aborted) return;

      const { prices } = data as { dates: string[]; prices: Record<string, (number | null)[]> };

      // Compute simple return series per symbol
      const returnSeries: Record<string, number[]> = {};
      const validSymbols: string[] = [];

      for (const sym of allSymbols) {
        const rawPrices = (prices[sym] ?? []).map((p: number | null) => p ?? 0);
        if (rawPrices.length > 5 && rawPrices.some((p) => p > 0)) {
          returnSeries[sym] = calculateSimpleReturns(rawPrices);
          if (returnSeries[sym].length >= 5) {
            validSymbols.push(sym);
          }
        }
      }

      if (ctrl.signal.aborted) return;

      if (validSymbols.length < 2) {
        setAnalytics({
          frontier: [],
          correlation: { labels: [], matrix: [] },
          brinson: [],
          waterfall: [],
        });
        setLoading(false);
        return;
      }

      // Build portfolio weights from positions
      const portfolioWeights: Record<string, number> = {};
      const totalValue = curPositions.reduce((s, p) => s + p.value, 0) || 1;
      for (const p of curPositions) {
        if (validSymbols.includes(p.symbol)) {
          portfolioWeights[p.symbol] = p.value / totalValue;
        }
      }
      // Fallback: equal weight for any symbol not in positions
      for (const sym of validSymbols) {
        if (portfolioWeights[sym] == null) {
          portfolioWeights[sym] = 1 / validSymbols.length;
        }
      }

      // Run all four calculations in parallel (all synchronous/CPU-bound)
      const frontier = generateEfficientFrontier(validSymbols, returnSeries, portfolioWeights, 500);
      const correlation = calculateCorrelationMatrix(validSymbols, returnSeries);
      const brinson = calculateBrinsonAttribution(validSymbols, portfolioWeights, returnSeries);
      const waterfall = calculateReturnContributions(validSymbols, portfolioWeights, returnSeries);

      if (!ctrl.signal.aborted) {
        setAnalytics({ frontier, correlation, brinson, waterfall });
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError('Erro ao processar dados de análise');
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  // Re-run whenever window changes (or positions change externally)
  useEffect(() => {
    compute(window);
  }, [window, compute]);

  const hasPositions =
    manualPositions.filter((p) => p.type !== 'prediction').length > 0 ||
    cryptoSymbols.length > 0;

  return (
    <div>
      {/* Window selector */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Janela de Análise:
        </span>
        <div className="flex gap-1">
          {(Object.keys(WINDOW_LABELS) as AnalysisWindow[]).map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                window === w
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {WINDOW_LABELS[w]}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {!hasPositions ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
          <svg className="w-12 h-12 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm font-medium">Adicione pelo menos 2 ativos à carteira</p>
          <p className="text-xs mt-1 opacity-70">Os indicadores avançados requerem histórico de múltiplos ativos</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm">Calculando indicadores para {WINDOW_LABELS[window]}…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => compute(window)}
            className="mt-3 px-4 py-2 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)] transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : analytics && (analytics.frontier.length > 0 || analytics.correlation.labels.length > 0) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <EfficientFrontierChart points={analytics.frontier} />
          <CorrelationMatrix data={analytics.correlation} />
          <BrinsonAttributionChart data={analytics.brinson} />
          <ReturnWaterfallChart items={analytics.waterfall} />
        </div>
      ) : analytics ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
          <p className="text-sm">Dados históricos insuficientes para a janela selecionada</p>
          <p className="text-xs mt-1 opacity-70">Tente uma janela menor ou adicione mais ativos</p>
        </div>
      ) : null}
    </div>
  );
}
