'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import AssetChat from '@/components/AssetChat';
import { getStockLogoUrl, getStockInitials } from '@/lib/stock-logos';
import { MAIN_STOCKS, STOCK_NAMES } from '@/lib/stocks-data';
import { calculateSMA, calculateEMA } from '@/lib/indicators';
import StockTradeIdeas from '@/components/StockTradeIdeas';
import {
  Area,
  AreaChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
  ComposedChart,
  LineChart,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
type StockTab = 'sumario' | 'contabil' | 'multiplos' | 'trade-idea' | 'valuation';

interface HistoryItem {
  date: string;
  fullDate: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FundamentalData = Record<string, any>;

interface StockDetail {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  averageDailyVolume10Day?: number;
  averageDailyVolume3Month?: number;
  dividendsData?: { cashDividends?: { rate: number; paymentDate: string; relatedTo: string }[] };
  data: HistoryItem[];
  logoUrl?: string;
  // Fundamental data
  summaryProfile?: FundamentalData;
  financialData?: FundamentalData;
  defaultKeyStatistics?: FundamentalData;
  incomeStatementHistory?: FundamentalData;
  balanceSheetHistory?: FundamentalData;
  cashflowStatementHistory?: FundamentalData;
  cashflowHistory?: FundamentalData;
  calendarEvents?: FundamentalData;
  recommendationTrend?: FundamentalData;
  majorHolders?: FundamentalData;
  earningsHistory?: FundamentalData;
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params.symbol as string;
  const [stock, setStock] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState('1mo');
  const [logoError, setLogoError] = useState(false);
  const [activeTab, setActiveTab] = useState<StockTab>('sumario');
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const fetchStock = async () => {
      setLoading(true);
      try {
        const rangeMap: Record<string, string> = {
          '1d': '1d', '5d': '5d', '1mo': '1mo', '3mo': '3mo',
          '6mo': '6mo', '1y': '1y', '5y': '5y', 'max': 'max',
        };
        const intervalMap: Record<string, string> = {
          '1d': '5m', '5d': '1h', '1mo': '1d', '3mo': '1d',
          '6mo': '1d', '1y': '1wk', '5y': '1mo', 'max': '1mo',
        };
        const range = rangeMap[timeWindow] || '1mo';
        const interval = intervalMap[timeWindow] || '1d';
        const modules = 'summaryProfile,financialData,defaultKeyStatistics,incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory,cashflowHistory,calendarEvents,recommendationTrend,majorHolders';

        const res = await fetch(
          `/api/stocks/quote?symbol=${symbol}&range=${range}&interval=${interval}&modules=${modules}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          setStock(data);
        }
      } catch {
        setStock(null);
      } finally {
        setLoading(false);
      }
    };
    if (symbol) fetchStock();
  }, [symbol, timeWindow]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <MarketTickerBar />
        <AppHeader />
        <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[var(--text-muted)]">Carregando dados de {symbol}...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <MarketTickerBar />
        <AppHeader />
        <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-[var(--text-muted)] mb-4">Ação não encontrada</p>
              <button
                onClick={() => router.push('/stocks')}
                className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg font-semibold hover:bg-[var(--accent-hover)] transition-colors"
              >
                Voltar para Ações
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isPositive = stock.changePercent >= 0;

  return (
    <>
      <div className={`min-h-screen bg-[var(--bg)] transition-all duration-300 ${chatOpen ? 'pr-[400px]' : ''}`}>
        <MarketTickerBar />
        <AppHeader />

        <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/stocks')}
                className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-16 h-16 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center overflow-hidden shadow-sm">
                {(stock.logoUrl || getStockLogoUrl(symbol)) && !logoError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={stock.logoUrl || getStockLogoUrl(symbol)}
                    alt={stock.name}
                    className="w-full h-full object-contain p-2"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-primary)] font-bold text-lg">
                    {getStockInitials(symbol)}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">{stock.name}</h1>
                <p className="text-[var(--text-muted)]">{stock.symbol} &bull; B3</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="data-value text-3xl font-bold text-[var(--text-primary)] mb-1">
                  {stock.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div className={`data-value text-xl font-semibold ${isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}% ({isPositive ? '+' : ''}
                  {stock.change.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                </div>
              </div>
              {/* Chat IA Toggle */}
              <button
                onClick={() => setChatOpen((o) => !o)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all border ${
                  chatOpen
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-lg shadow-[var(--accent)]/20'
                    : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]/50 hover:text-[var(--text-primary)]'
                }`}
                title={chatOpen ? 'Fechar Chat IA' : 'Abrir Chat IA'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Chat IA
              </button>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex items-center gap-2 bg-[var(--surface)]/60 border border-[var(--border)] rounded-2xl p-1.5 overflow-x-auto sticky top-[120px] z-30 backdrop-blur-sm">
            {([
              { key: 'sumario', label: 'Sumario', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
              { key: 'contabil', label: 'Contabil', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { key: 'multiplos', label: 'Multiplos e Indices', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
              { key: 'trade-idea', label: 'Trade Idea', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
              { key: 'valuation', label: 'Valuation', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M12 7h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            ] as { key: StockTab; label: string; icon: string }[]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-lg shadow-[var(--accent)]/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'sumario' && <SumarioTab stock={stock} />}
          {activeTab === 'contabil' && <ContabilTab stock={stock} />}
          {activeTab === 'multiplos' && <MultiplosTab stock={stock} />}
          {activeTab === 'trade-idea' && (
            <HistoricoTab stock={stock} timeWindow={timeWindow} setTimeWindow={setTimeWindow} />
          )}
          {activeTab === 'valuation' && <ValuacaoTab stock={stock} />}
        </main>
      </div>

      {/* Fixed Chat Panel */}
      <div
        className={`fixed right-0 top-0 h-screen w-[400px] z-50 border-l border-[var(--border)] shadow-2xl transition-transform duration-300 ${
          chatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <AssetChat
          symbol={symbol}
          assetType="stock"
          assetName={stock.name}
          onClose={() => setChatOpen(false)}
        />
      </div>
    </>
  );
}

/* ─── HELPER COMPONENTS ─── */

function InfoCard({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-xl p-4">
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${valueClass || 'text-[var(--text-primary)]'}`}>{value}</p>
    </div>
  );
}

function formatBRL(v: number | undefined | null): string {
  if (v == null || isNaN(v)) return '-';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatLargeNumber(v: number | undefined | null, prefix = 'R$ '): string {
  if (v == null || isNaN(v)) return '-';
  if (Math.abs(v) >= 1e12) return `${prefix}${(v / 1e12).toFixed(2)}T`;
  if (Math.abs(v) >= 1e9) return `${prefix}${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `${prefix}${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `${prefix}${(v / 1e3).toFixed(0)}K`;
  return `${prefix}${v.toLocaleString('pt-BR')}`;
}

function formatPercent(v: number | undefined | null): string {
  if (v == null || isNaN(v)) return '-';
  return `${(v * 100).toFixed(2)}%`;
}

function formatNumber(v: number | undefined | null, decimals = 2): string {
  if (v == null || isNaN(v)) return '-';
  return v.toFixed(decimals);
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-b-0">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className="text-sm font-bold data-value text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

/* ─── SUMARIO TAB ─── */

function SumarioTab({ stock }: { stock: StockDetail }) {
  const fd = stock.financialData || {};
  const ks = stock.defaultKeyStatistics || {};
  const sp = stock.summaryProfile || {};

  // ─── Beta calculation: 1-year daily returns vs BOVA11 (IBOV proxy) ─────
  const [calcBeta, setCalcBeta] = useState<number | null>(null);
  const [betaLoading, setBetaLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setBetaLoading(true);
    (async () => {
      try {
        const [sRes, iRes] = await Promise.all([
          fetch(`/api/stocks/quote?symbol=${stock.symbol}&range=1y&interval=1d`),
          fetch(`/api/stocks/quote?symbol=BOVA11&range=1y&interval=1d`),
        ]);
        const [sJson, iJson] = await Promise.all([sRes.json(), iRes.json()]);
        if (cancelled) return;

        const sC: number[] = (sJson.data ?? []).map((d: HistoryItem) => d.close).filter((c: number) => c > 0);
        const iC: number[] = (iJson.data ?? []).map((d: HistoryItem) => d.close).filter((c: number) => c > 0);
        const len = Math.min(sC.length, iC.length);
        if (len < 20) return;

        const sRet: number[] = [], iRet: number[] = [];
        for (let i = 1; i < len; i++) {
          sRet.push((sC[i] - sC[i - 1]) / sC[i - 1]);
          iRet.push((iC[i] - iC[i - 1]) / iC[i - 1]);
        }
        const n = sRet.length;
        const sMean = sRet.reduce((a, b) => a + b, 0) / n;
        const iMean = iRet.reduce((a, b) => a + b, 0) / n;
        let cov = 0, varI = 0;
        for (let i = 0; i < n; i++) {
          cov += (sRet[i] - sMean) * (iRet[i] - iMean);
          varI += (iRet[i] - iMean) ** 2;
        }
        cov /= n; varI /= n;
        if (varI > 0) setCalcBeta(cov / varI);
      } catch { /* noop */ } finally {
        if (!cancelled) setBetaLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [stock.symbol]);

  // ─── P/L and P/S manually ───────────────────────────────────────────
  const incomeHistory: FundamentalData[] =
    stock.incomeStatementHistory?.incomeStatementHistory
    ?? (Array.isArray(stock.incomeStatementHistory) ? stock.incomeStatementHistory : []);
  const lastNetIncome: number | null = incomeHistory[0]?.netIncome ?? null;
  const totalRevenue: number | null = fd.totalRevenue ?? null;

  const plCalc = stock.marketCap && lastNetIncome && lastNetIncome > 0
    ? stock.marketCap / lastNetIncome : null;
  const psCalc = stock.marketCap && totalRevenue && totalRevenue > 0
    ? stock.marketCap / totalRevenue : null;

  // ─── Calendar events ────────────────────────────────────────────────
  const calEarnings: string[] = stock.calendarEvents?.earnings?.earningsDate ?? [];
  const exDivDate: string | null = stock.calendarEvents?.exDividendDate ?? null;
  const divDate: string | null = stock.calendarEvents?.dividendDate ?? null;
  const allEvents: { label: string; date: string; type: 'earnings' | 'dividend' | 'ex-div' }[] = [
    ...calEarnings.map((d) => ({ label: 'Resultados (Earnings)', date: d, type: 'earnings' as const })),
    ...(exDivDate ? [{ label: 'Data Ex-Dividendo', date: exDivDate, type: 'ex-div' as const }] : []),
    ...(divDate ? [{ label: 'Pagamento de Dividendo', date: divDate, type: 'dividend' as const }] : []),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const betaDisplay = betaLoading
    ? '...'
    : calcBeta !== null
      ? calcBeta.toFixed(2)
      : formatNumber(ks.beta);

  return (
    <div className="space-y-6">
      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <InfoCard label="Market Cap" value={formatLargeNumber(stock.marketCap)} />
        <InfoCard label="Volume Medio (10d)" value={formatLargeNumber(stock.averageDailyVolume10Day)} />
        <InfoCard
          label="Beta (12M vs IBOV)"
          value={betaDisplay}
          valueClass={calcBeta !== null && calcBeta > 1.2 ? 'text-[var(--danger)]' : calcBeta !== null && calcBeta < 0.8 ? 'text-[var(--success)]' : undefined}
        />
        <InfoCard
          label="P/L (MktCap / LL)"
          value={plCalc !== null ? plCalc.toFixed(1) : formatNumber(ks.trailingPE)}
          valueClass={plCalc !== null && plCalc > 25 ? 'text-[var(--danger)]' : plCalc !== null && plCalc < 12 ? 'text-[var(--success)]' : undefined}
        />
        <InfoCard
          label="P/S (MktCap / RB)"
          value={psCalc !== null ? psCalc.toFixed(2) : formatNumber(ks.priceToSalesTrailing12Months)}
        />
        <InfoCard label="52 Sem. Min/Max" value={`${formatBRL(stock.fiftyTwoWeekLow)} / ${formatBRL(stock.fiftyTwoWeekHigh)}`} />
      </div>

      {/* Financial Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--accent)] rounded-full" />
            <h3 className="section-title text-xs">Dados Financeiros</h3>
          </div>
          <div className="space-y-1">
            <MetricRow label="Receita Total (Receita Bruta)" value={formatLargeNumber(fd.totalRevenue)} />
            <MetricRow label="Crescimento Receita" value={formatPercent(fd.revenueGrowth)} />
            <MetricRow label="Lucro Bruto" value={formatLargeNumber(fd.grossProfits)} />
            <MetricRow label="EBITDA" value={formatLargeNumber(fd.ebitda)} />
            <MetricRow label="Lucro Liquido" value={formatLargeNumber(lastNetIncome)} />
            <MetricRow label="Caixa Total" value={formatLargeNumber(fd.totalCash)} />
            <MetricRow label="Divida Total" value={formatLargeNumber(fd.totalDebt)} />
            <MetricRow label="Free Cash Flow" value={formatLargeNumber(fd.freeCashflow)} />
          </div>
        </div>

        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--accent)] rounded-full" />
            <h3 className="section-title text-xs">Margens</h3>
          </div>
          <div className="space-y-1">
            <MetricRow label="Margem Bruta" value={formatPercent(fd.grossMargins)} />
            <MetricRow label="Margem Operacional" value={formatPercent(fd.operatingMargins)} />
            <MetricRow label="Margem Lucro" value={formatPercent(fd.profitMargins)} />
            <MetricRow label="Margem EBITDA" value={formatPercent(fd.ebitdaMargins)} />
            <MetricRow label="ROE" value={formatPercent(fd.returnOnEquity)} />
            <MetricRow label="ROA" value={formatPercent(fd.returnOnAssets)} />
          </div>
        </div>

        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--accent)] rounded-full" />
            <h3 className="section-title text-xs">Liquidez & Volatilidade</h3>
          </div>
          <div className="space-y-1">
            <MetricRow label="Volume Hoje" value={formatLargeNumber(stock.volume)} />
            <MetricRow label="Vol. Medio 3M" value={formatLargeNumber(stock.averageDailyVolume3Month)} />
            <MetricRow label="Vol. Medio 10D" value={formatLargeNumber(stock.averageDailyVolume10Day)} />
            <MetricRow label="Abertura" value={formatBRL(stock.open)} />
            <MetricRow label="Maxima" value={formatBRL(stock.high)} />
            <MetricRow label="Minima" value={formatBRL(stock.low)} />
            <MetricRow label="Fechamento Anterior" value={formatBRL(stock.previousClose)} />
          </div>
        </div>
      </div>

      {/* Business Description */}
      {sp.longBusinessSummary && (
        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--accent)] rounded-full" />
            <h3 className="section-title text-xs">Descricao do Negocio</h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{sp.longBusinessSummary}</p>
        </div>
      )}

      {/* Major Holders */}
      {stock.majorHolders && (
        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--accent)] rounded-full" />
            <h3 className="section-title text-xs">Principais Acionistas</h3>
          </div>
          {Array.isArray(stock.majorHolders) ? (
            <div className="space-y-2">
              {stock.majorHolders.map((holder: { name?: string; value?: string; holder?: string; percentage?: number }, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-b-0">
                  <span className="text-sm text-[var(--text-secondary)]">{holder.name || holder.holder || `Holder ${idx + 1}`}</span>
                  <span className="text-sm font-bold data-value text-[var(--text-primary)]">{holder.value || (holder.percentage ? `${(holder.percentage * 100).toFixed(2)}%` : '-')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Dados de acionistas não disponíveis</p>
          )}
        </div>
      )}

      {/* Corporate Events Calendar */}
      <div className="modern-card">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
          <div className="w-1 h-5 bg-[var(--warning)] rounded-full" />
          <h3 className="section-title text-xs">Calendario de Eventos Corporativos</h3>
        </div>
        {allEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)] border-b-2 border-[var(--border)]">
                  <th className="pb-2 text-left">EVENTO</th>
                  <th className="pb-2 text-center">TIPO</th>
                  <th className="pb-2 text-right">DATA</th>
                  <th className="pb-2 text-right">DIAS RESTANTES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {allEvents.map((ev, idx) => {
                  const evDate = new Date(ev.date);
                  const daysLeft = Math.ceil((evDate.getTime() - Date.now()) / 86_400_000);
                  const isPast = daysLeft < 0;
                  const typeColors = {
                    earnings: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                    dividend: 'bg-green-500/15 text-green-400 border-green-500/30',
                    'ex-div': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
                  };
                  return (
                    <tr key={idx} className={`hover:bg-[var(--surface-hover)] transition-colors ${isPast ? 'opacity-50' : ''}`}>
                      <td className="py-2.5 text-sm text-[var(--text-secondary)]">{ev.label}</td>
                      <td className="py-2.5 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeColors[ev.type]}`}>
                          {ev.type === 'earnings' ? 'Resultados' : ev.type === 'dividend' ? 'Dividendo' : 'Ex-Div'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-sm font-bold data-value text-[var(--text-primary)]">
                        {evDate.toLocaleDateString('pt-BR')}
                      </td>
                      <td className={`py-2.5 text-right text-sm font-bold data-value ${isPast ? 'text-[var(--text-muted)]' : 'text-[var(--accent)]'}`}>
                        {isPast ? `${Math.abs(daysLeft)}d atrás` : `${daysLeft}d`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Nenhum evento corporativo agendado.</p>
        )}
      </div>

      {/* Dividends */}
      {stock.dividendsData?.cashDividends && stock.dividendsData.cashDividends.length > 0 && (
        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--success)] rounded-full" />
            <h3 className="section-title text-xs">Dividendos Recentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)] border-b-2 border-[var(--border)]">
                  <th className="pb-2 text-left">DATA</th>
                  <th className="pb-2 text-right">VALOR</th>
                  <th className="pb-2 text-right">REFERENTE A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {stock.dividendsData.cashDividends.slice(0, 10).map((div: { paymentDate: string; rate: number; relatedTo: string }, idx: number) => (
                  <tr key={idx} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="py-2 text-sm text-[var(--text-secondary)]">
                      {new Date(div.paymentDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2 text-right text-sm font-bold text-[var(--success)] data-value">
                      {formatBRL(div.rate)}
                    </td>
                    <td className="py-2 text-right text-xs text-[var(--text-muted)]">{div.relatedTo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* IR Link */}
      {sp.website && (
        <div className="flex items-center gap-3">
          <a
            href={sp.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 bg-[var(--accent-soft)] text-[var(--accent)] rounded-xl font-semibold text-sm border border-[var(--accent)]/30 hover:bg-[var(--accent)] hover:text-[var(--text-inverse)] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Site RI da Empresa
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── CONTABIL TAB ─── */

function ContabilTab({ stock }: { stock: StockDetail }) {
  const incomeHistory = stock.incomeStatementHistory?.incomeStatementHistory
    || (Array.isArray(stock.incomeStatementHistory) ? stock.incomeStatementHistory : []);
  const balanceHistory = stock.balanceSheetHistory?.balanceSheetHistory
    || (Array.isArray(stock.balanceSheetHistory) ? stock.balanceSheetHistory : []);
  const cashflowData = stock.cashflowHistory?.cashflowHistory
    || stock.cashflowHistory?.cashflowStatements
    || stock.cashflowStatementHistory?.cashflowStatements
    || (Array.isArray(stock.cashflowHistory) ? stock.cashflowHistory : []);

  const hasData = incomeHistory.length > 0 || balanceHistory.length > 0 || cashflowData.length > 0;

  if (!hasData) {
    return (
      <div className="modern-card p-12 text-center">
        <p className="text-[var(--text-muted)]">Dados contábeis não disponíveis para esta ação.</p>
        <p className="text-xs text-[var(--text-muted)] mt-2">A API pode nao fornecer dados fundamentais para este ativo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* DRE - Income Statement */}
      {incomeHistory.length > 0 && (
        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--accent)] rounded-full" />
            <h3 className="section-title text-xs">DRE — Demonstração do Resultado</h3>
          </div>
          <FinancialTable
            data={incomeHistory}
            fields={[
              { key: 'totalRevenue',                    label: 'Receita Total (Bruta)' },
              { key: 'costOfRevenue',                   label: 'CPV / Custo da Receita' },
              { key: 'grossProfit',                     label: 'Lucro Bruto', bold: true },
              { key: 'researchDevelopment',             label: 'Pesquisa & Desenvolvimento' },
              { key: 'sellingGeneralAdministrative',    label: 'SG&A (Vendas, Gerais e Adm.)' },
              { key: 'nonRecurring',                    label: 'Itens Não Recorrentes' },
              { key: 'otherOperatingExpenses',          label: 'Outras Despesas Operacionais' },
              { key: 'totalOperatingExpenses',          label: 'Total Despesas Operacionais' },
              { key: 'operatingIncome',                 label: 'Lucro Operacional (EBIT)', bold: true },
              { key: 'ebit',                            label: 'EBIT (alt)' },
              { key: 'interestExpense',                 label: 'Despesa Financeira (Juros)' },
              { key: 'totalOtherIncomeExpenseNet',      label: 'Outras Receitas / Despesas Líq.' },
              { key: 'incomeBeforeTax',                 label: 'LAIR (Lucro antes IR)', bold: true },
              { key: 'incomeTaxExpense',                label: 'Imposto de Renda (IR/CSLL)' },
              { key: 'minorityInterest',                label: 'Participação Minoritária' },
              { key: 'netIncomeFromContinuingOps',      label: 'LL — Operações Continuadas' },
              { key: 'discontinuedOperations',          label: 'Operações Descontinuadas' },
              { key: 'netIncome',                       label: 'Lucro Líquido', bold: true },
              { key: 'netIncomeApplicableToCommonShares', label: 'LL Atribuível aos Acionistas' },
              { key: 'basicEPS',                        label: 'LPA Básico (por ação)' },
              { key: 'dilutedEPS',                      label: 'LPA Diluído (por ação)' },
            ]}
          />
        </div>
      )}

      {/* Balance Sheet */}
      {balanceHistory.length > 0 && (
        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--info)] rounded-full" />
            <h3 className="section-title text-xs">Balanço Patrimonial</h3>
          </div>
          <FinancialTable
            data={balanceHistory}
            fields={[
              { key: 'totalAssets',                label: 'ATIVO TOTAL', bold: true },
              { key: 'totalCurrentAssets',         label: 'Ativo Circulante', bold: true },
              { key: 'cash',                       label: '  Caixa & Equivalentes' },
              { key: 'shortTermInvestments',       label: '  Aplicações Financeiras CP' },
              { key: 'netReceivables',             label: '  Contas a Receber' },
              { key: 'inventory',                  label: '  Estoques' },
              { key: 'otherCurrentAssets',         label: '  Outros Ativos Circulantes' },
              { key: 'propertyPlantEquipment',     label: 'Imobilizado Líquido (PP&E)' },
              { key: 'goodwill',                   label: 'Ágio (Goodwill)' },
              { key: 'intangibleAssets',           label: 'Intangíveis' },
              { key: 'longTermInvestments',        label: 'Investimentos LP' },
              { key: 'deferredLongTermAssetCharges', label: 'Ativo Diferido LP' },
              { key: 'otherAssets',                label: 'Outros Ativos' },
              { key: 'totalLiab',                  label: 'PASSIVO TOTAL', bold: true },
              { key: 'totalCurrentLiabilities',    label: 'Passivo Circulante', bold: true },
              { key: 'accountsPayable',            label: '  Fornecedores (AP)' },
              { key: 'shortLongTermDebt',          label: '  Dívida CP' },
              { key: 'otherCurrentLiab',           label: '  Outros Passivos Circulantes' },
              { key: 'longTermDebt',               label: 'Dívida Longo Prazo' },
              { key: 'deferredLongTermLiab',       label: 'Passivo Diferido LP' },
              { key: 'minorityInterest',           label: 'Participação Minoritária' },
              { key: 'otherLiab',                  label: 'Outros Passivos LP' },
              { key: 'totalStockholderEquity',     label: 'PATRIMÔNIO LÍQUIDO (PL)', bold: true },
              { key: 'commonStock',                label: '  Capital Social' },
              { key: 'capitalSurplus',             label: '  Reserva de Capital' },
              { key: 'retainedEarnings',           label: '  Lucros / Prejuízos Acumulados' },
              { key: 'treasuryStock',              label: '  Ações em Tesouraria' },
              { key: 'otherStockholderEquity',     label: '  Outros (PL)' },
            ]}
          />
        </div>
      )}

      {/* Cash Flow */}
      {cashflowData.length > 0 && (
        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--success)] rounded-full" />
            <h3 className="section-title text-xs">Fluxo de Caixa</h3>
          </div>
          <FinancialTable
            data={cashflowData}
            fields={[
              { key: 'netIncome',                            label: 'Lucro Líquido (base)' },
              { key: 'depreciation',                        label: 'D&A (Depreciação & Amortização)', bold: true },
              { key: 'changeToNetincome',                   label: '  Ajustes ao Lucro Líquido' },
              { key: 'changeToAccountReceivables',          label: '  Var. Contas a Receber' },
              { key: 'changeToInventory',                   label: '  Var. Estoques' },
              { key: 'changeToLiabilities',                 label: '  Var. Passivos Operacionais' },
              { key: 'changeToOperatingActivities',         label: '  Var. Capital de Giro (outros)' },
              { key: 'otherCashflowsFromOperatingActivities', label: '  Outros Ajustes Operacionais' },
              { key: 'totalCashFromOperatingActivities',    label: 'FCO — Caixa Operacional', bold: true },
              { key: 'operatingCashFlow',                   label: 'FCO (alt)' },
              { key: 'capitalExpenditures',                 label: 'CapEx (Despesas de Capital)', bold: true },
              { key: 'investments',                         label: '  Investimentos Financeiros' },
              { key: 'otherCashflowsFromInvestingActivities', label: '  Outros Investimentos' },
              { key: 'totalCashflowsFromInvestingActivities', label: 'FCI — Caixa de Investimentos', bold: true },
              { key: 'dividendsPaid',                       label: '  Dividendos Pagos' },
              { key: 'netBorrowings',                       label: '  Captações / (Pagamentos) Líq.' },
              { key: 'repurchaseOfStock',                   label: '  Recompra de Ações' },
              { key: 'issuanceOfStock',                     label: '  Emissão de Ações' },
              { key: 'otherCashflowsFromFinancingActivities', label: '  Outros Financiamentos' },
              { key: 'totalCashFromFinancingActivities',    label: 'FCF — Caixa de Financiamentos', bold: true },
              { key: 'effectOfExchangeRate',                label: 'Efeito Câmbio no Caixa' },
              { key: 'changeInCash',                        label: 'Variação Líquida de Caixa', bold: true },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function FinancialTable({
  data,
  fields,
}: {
  data: FundamentalData[];
  fields: { key: string; label: string; bold?: boolean }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)] border-b-2 border-[var(--border)]">
            <th className="pb-2 text-left min-w-[240px]">ITEM</th>
            {data.map((item: FundamentalData, i: number) => (
              <th key={i} className="pb-2 text-right min-w-[120px]">
                {item.endDate ? new Date(item.endDate).getFullYear() : `Periodo ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {fields
            .filter((field) => data.some((item) => item[field.key] != null))
            .map((field) => (
            <tr key={field.key} className={`transition-colors ${field.bold ? 'bg-[var(--surface)]/40' : 'hover:bg-[var(--surface-hover)]'}`}>
              <td className={`py-2 text-xs ${field.bold ? 'font-bold text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]'}`}>
                {field.label}
              </td>
              {data.map((item: FundamentalData, i: number) => (
                <td key={i} className={`py-2 text-right text-xs data-value ${field.bold ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}>
                  {formatLargeNumber(item[field.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── MULTIPLOS TAB ─── */

function MultiplosTab({ stock }: { stock: StockDetail }) {
  const fd = stock.financialData || {};
  const ks = stock.defaultKeyStatistics || {};

  // Compute derived metrics
  const totalDebt = fd.totalDebt || 0;
  const totalCash = fd.totalCash || 0;
  const netDebt = totalDebt - totalCash;
  const equity = fd.totalStockholderEquity || ks.bookValue || 0;
  const fcf = fd.freeCashflow || 0;
  const ebitda = fd.ebitda || 0;
  const totalAssets = fd.totalAssets || 0;

  return (
    <div className="space-y-6">
      {/* Valuation */}
      <div className="modern-card">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
          <div className="w-1 h-5 bg-[var(--accent)] rounded-full" />
          <h3 className="section-title text-xs">Indicadores de Valuation</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <InfoCard label="Dividend Yield" value={formatPercent(ks.dividendYield || fd.dividendYield)} />
          <InfoCard label="P/L (Trailing)" value={formatNumber(ks.trailingPE || fd.trailingPE)} />
          <InfoCard label="P/L (Forward)" value={formatNumber(ks.forwardPE || fd.forwardPE)} />
          <InfoCard label="PEG Ratio" value={formatNumber(ks.pegRatio)} />
          <InfoCard label="P/VP" value={formatNumber(ks.priceToBook)} />
          <InfoCard label="EV/EBITDA" value={formatNumber(ks.enterpriseToEbitda)} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          <InfoCard label="EV/EBIT" value={formatNumber(ks.enterpriseToRevenue)} />
          <InfoCard label="Enterprise Value" value={formatLargeNumber(ks.enterpriseValue)} />
          <InfoCard label="Market Cap" value={formatLargeNumber(stock.marketCap)} />
          <InfoCard label="Price/Sales" value={formatNumber(ks.priceToSalesTrailing12Months)} />
        </div>
      </div>

      {/* Debt Indicators */}
      <div className="modern-card">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
          <div className="w-1 h-5 bg-[var(--danger)] rounded-full" />
          <h3 className="section-title text-xs">Indicadores de Endividamento</h3>
        </div>
        <div className="space-y-1">
          <MetricRow label="Divida Total" value={formatLargeNumber(totalDebt)} />
          <MetricRow label="Caixa Total" value={formatLargeNumber(totalCash)} />
          <MetricRow label="Divida Liquida" value={formatLargeNumber(netDebt)} />
          <MetricRow label="Divida/EBITDA" value={ebitda ? formatNumber(totalDebt / ebitda) : '-'} />
          <MetricRow label="Divida Liquida/Equity" value={equity ? formatNumber(netDebt / equity) : '-'} />
          <MetricRow label="Current Ratio" value={formatNumber(fd.currentRatio)} />
          <MetricRow label="Quick Ratio" value={formatNumber(fd.quickRatio)} />
          <MetricRow label="Debt/Equity" value={formatNumber(fd.debtToEquity)} />
        </div>
      </div>

      {/* Profitability & Efficiency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--success)] rounded-full" />
            <h3 className="section-title text-xs">Rentabilidade</h3>
          </div>
          <div className="space-y-1">
            <MetricRow label="ROE" value={formatPercent(fd.returnOnEquity)} />
            <MetricRow label="ROA" value={formatPercent(fd.returnOnAssets)} />
            <MetricRow label="ROIC" value={formatPercent(fd.returnOnCapital)} />
            <MetricRow label="Margem Bruta" value={formatPercent(fd.grossMargins)} />
            <MetricRow label="Margem Operacional" value={formatPercent(fd.operatingMargins)} />
            <MetricRow label="Margem Lucro" value={formatPercent(fd.profitMargins)} />
          </div>
        </div>

        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--info)] rounded-full" />
            <h3 className="section-title text-xs">Crescimento & Payout</h3>
          </div>
          <div className="space-y-1">
            <MetricRow label="Crescimento Receita" value={formatPercent(fd.revenueGrowth)} />
            <MetricRow label="Crescimento Lucro" value={formatPercent(fd.earningsGrowth)} />
            <MetricRow label="Payout Ratio" value={formatPercent(ks.payoutRatio)} />
            <MetricRow label="Dividend Yield" value={formatPercent(ks.dividendYield)} />
            <MetricRow label="Shares Outstanding" value={formatLargeNumber(ks.sharesOutstanding, '')} />
            <MetricRow label="Float Shares" value={formatLargeNumber(ks.floatShares, '')} />
          </div>
        </div>
      </div>

      {/* Historical Solvency */}
      <div className="modern-card">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
          <div className="w-1 h-5 bg-[var(--warning)] rounded-full" />
          <h3 className="section-title text-xs">Historical Solvency Measures</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <InfoCard label="Cash Equivalents" value={formatLargeNumber(totalCash)} />
          <InfoCard label="Long-term Debts" value={formatLargeNumber(fd.longTermDebt)} />
          <InfoCard label="Total Debt" value={formatLargeNumber(totalDebt)} />
          <InfoCard label="Free Cash Flow" value={formatLargeNumber(fcf)} />
          <InfoCard label="Net Debt / Equity" value={equity ? formatNumber(netDebt / equity) : '-'} />
          <InfoCard label="Net Debt / Assets" value={totalAssets ? formatNumber(netDebt / totalAssets) : '-'} />
          <InfoCard
            label="Altman Z-Score"
            value={computeAltmanZScore(fd, ks, stock.marketCap)}
            valueClass={getZScoreColor(computeAltmanZScore(fd, ks, stock.marketCap))}
          />
          <InfoCard label="FCF / Debt" value={totalDebt ? formatNumber(fcf / totalDebt) : '-'} />
          <InfoCard label="FCF / Liabilities" value={fd.totalLiab ? formatNumber(fcf / fd.totalLiab) : '-'} />
        </div>
      </div>
    </div>
  );
}

function computeAltmanZScore(fd: FundamentalData, ks: FundamentalData, marketCap?: number): string {
  // Simplified Altman Z-Score: Z = 1.2*A + 1.4*B + 3.3*C + 0.6*D + 1.0*E
  const totalAssets = fd.totalAssets;
  if (!totalAssets || totalAssets === 0) return '-';

  const workingCapital = (fd.totalCurrentAssets || 0) - (fd.totalCurrentLiabilities || 0);
  const retainedEarnings = fd.retainedEarnings || 0;
  const ebit = fd.ebit || fd.operatingIncome || 0;
  const totalLiab = fd.totalLiab || 0;
  const marketValue = marketCap || ks.marketCap || 0;
  const revenue = fd.totalRevenue || 0;

  const A = workingCapital / totalAssets;
  const B = retainedEarnings / totalAssets;
  const C = ebit / totalAssets;
  const D = totalLiab > 0 ? marketValue / totalLiab : 0;
  const E = revenue / totalAssets;

  const z = 1.2 * A + 1.4 * B + 3.3 * C + 0.6 * D + 1.0 * E;
  return z.toFixed(2);
}

function getZScoreColor(zStr: string): string {
  const z = parseFloat(zStr);
  if (isNaN(z)) return 'text-[var(--text-primary)]';
  if (z > 2.99) return 'text-[var(--success)]';
  if (z > 1.81) return 'text-[var(--warning)]';
  return 'text-[var(--danger)]';
}

/* ─── HISTORICO TAB ─── */

// Format a date string for the X-axis based on the time window
function formatDateLabel(dateStr: string, window: string): string {
  if (!dateStr) return dateStr;
  try {
    const d = new Date(dateStr + 'T12:00:00');
    if (['1y', '5y', 'max'].includes(window)) {
      const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return `${months[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
    }
    if (window === '6mo' || window === '3mo') {
      const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return `${months[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
    }
  } catch { /* noop */ }
  return dateStr;
}

function HistoricoTab({
  stock,
  timeWindow,
  setTimeWindow,
}: {
  stock: StockDetail;
  timeWindow: string;
  setTimeWindow: (w: string) => void;
}) {
  const isPositive = stock.changePercent >= 0;

  // ─── Indicator state ────────────────────────────────────────────
  const [showSMA, setShowSMA] = useState(false);
  const [smaWindow, setSmaWindow] = useState(20);
  const [showEMA, setShowEMA] = useState(false);
  const [emaWindow, setEmaWindow] = useState(20);

  // ─── SELIC rate (dynamic from BCB) ──────────────────────────────
  const [selicRate, setSelicRate] = useState(14.25); // fallback
  useEffect(() => {
    let cancelled = false;
    fetch('/api/selic')
      .then(r => r.json())
      .then(d => { if (!cancelled && d.rate) setSelicRate(d.rate); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ─── Full history for SMA/EMA warmup ───────────────────────────
  const [fullHistory, setFullHistory] = useState<HistoryItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stocks/quote?symbol=${stock.symbol}&range=max&interval=1d`)
      .then(r => r.json())
      .then(d => { if (!cancelled && d.data) setFullHistory(d.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [stock.symbol]);

  // ─── BOVA11 benchmark for alpha ─────────────────────────────────
  const [ibovHistory, setIbovHistory] = useState<HistoryItem[]>([]);
  const fetchIbov = useCallback(async () => {
    const rangeMap: Record<string, string> = { '1d': '1d', '5d': '5d', '1mo': '1mo', '3mo': '3mo', '6mo': '6mo', '1y': '1y', '5y': '5y', 'max': 'max' };
    const intervalMap: Record<string, string> = { '1d': '5m', '5d': '1h', '1mo': '1d', '3mo': '1d', '6mo': '1d', '1y': '1wk', '5y': '1mo', 'max': '1mo' };
    try {
      const res = await fetch(`/api/stocks/quote?symbol=BOVA11&range=${rangeMap[timeWindow] || '1y'}&interval=${intervalMap[timeWindow] || '1d'}`);
      const d = await res.json();
      if (d.data) setIbovHistory(d.data);
    } catch { /* noop */ }
  }, [timeWindow]);
  useEffect(() => { fetchIbov(); }, [fetchIbov]);

  // ─── Comparison state ───────────────────────────────────────────
  const [comparisonSymbol, setComparisonSymbol] = useState<string>('');
  const [comparisonSearch, setComparisonSearch] = useState('');
  const [comparisonData, setComparisonData] = useState<HistoryItem[] | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [showCompDropdown, setShowCompDropdown] = useState(false);
  const compRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (compRef.current && !compRef.current.contains(e.target as Node)) setShowCompDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!comparisonSymbol) { setComparisonData(null); return; }
    const rangeMap: Record<string, string> = { '1d': '1d', '5d': '5d', '1mo': '1mo', '3mo': '3mo', '6mo': '6mo', '1y': '1y', '5y': '5y', 'max': 'max' };
    const intervalMap: Record<string, string> = { '1d': '5m', '5d': '1h', '1mo': '1d', '3mo': '1d', '6mo': '1d', '1y': '1wk', '5y': '1mo', 'max': '1mo' };
    setComparisonLoading(true);
    fetch(`/api/stocks/quote?symbol=${comparisonSymbol}&range=${rangeMap[timeWindow] || '1mo'}&interval=${intervalMap[timeWindow] || '1d'}`)
      .then(r => r.json())
      .then(d => { if (d.data) setComparisonData(d.data); })
      .catch(() => setComparisonData(null))
      .finally(() => setComparisonLoading(false));
  }, [comparisonSymbol, timeWindow]);

  const compSearchResults = useMemo(() => {
    if (comparisonSearch.length < 2) return [];
    const q = comparisonSearch.toUpperCase();
    return MAIN_STOCKS.filter(s => s !== stock.symbol && (s.includes(q) || (STOCK_NAMES[s] || '').toUpperCase().includes(q))).slice(0, 8);
  }, [comparisonSearch, stock.symbol]);

  const isComparing = !!(comparisonData && comparisonData.length > 0);

  // ─── SMA/EMA on FULL history, sliced to display window ─────────
  const fullClosePrices = useMemo(() => fullHistory.map(d => d.close), [fullHistory]);
  const displayLen = stock.data.length;

  const fullSMA = useMemo(() => {
    if (!showSMA || fullClosePrices.length === 0) return null;
    return calculateSMA(fullClosePrices, smaWindow);
  }, [showSMA, fullClosePrices, smaWindow]);

  const fullEMA = useMemo(() => {
    if (!showEMA || fullClosePrices.length === 0) return null;
    return calculateEMA(fullClosePrices, emaWindow);
  }, [showEMA, fullClosePrices, emaWindow]);

  const smaValues = useMemo(() => {
    if (!fullSMA) return null;
    return fullSMA.slice(Math.max(0, fullSMA.length - displayLen));
  }, [fullSMA, displayLen]);

  const emaValues = useMemo(() => {
    if (!fullEMA) return null;
    return fullEMA.slice(Math.max(0, fullEMA.length - displayLen));
  }, [fullEMA, displayLen]);

  // ─── Chart data ─────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (isComparing) {
      const basePrice = stock.data[0]?.close || 1;
      const compBasePrice = comparisonData![0]?.close || 1;
      return stock.data.map((item, idx) => ({
        date: formatDateLabel(item.date, timeWindow),
        [stock.symbol]: item.close > 0 ? item.close / basePrice : undefined,
        [comparisonSymbol]: comparisonData![idx]?.close > 0 ? comparisonData![idx].close / compBasePrice : undefined,
      }));
    }
    return stock.data.map((item, idx) => ({
      date: formatDateLabel(item.date, timeWindow),
      fullDate: item.fullDate,
      price: item.close,
      volume: item.volume,
      high: item.high,
      low: item.low,
      open: item.open,
      adjustedClose: item.adjustedClose || item.close,
      sma: smaValues?.[idx] ?? undefined,
      ema: emaValues?.[idx] ?? undefined,
    }));
  }, [stock.data, smaValues, emaValues, isComparing, comparisonData, comparisonSymbol, stock.symbol, timeWindow]);

  // Y-axis bounds
  const chartPrices = !isComparing ? chartData.map(d => (d as { price: number }).price).filter(p => p > 0) : [];
  const priceMin = chartPrices.length > 0 ? Math.min(...chartPrices) * 0.98 : 0;
  const priceMax = chartPrices.length > 0 ? Math.max(...chartPrices) * 1.02 : 0;

  // ─── Stats ────────────────────────────────────────────────────────
  const validData = stock.data.filter(d => d.close > 0);
  const closes = validData.map(d => d.close);
  const n = closes.length;

  const dailyReturns = useMemo(() => {
    const r: number[] = [];
    for (let i = 1; i < closes.length; i++) r.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    return r;
  }, [closes]);

  const firstClose = closes.length > 0 ? closes[0] : 0;
  const lastClose = closes.length > 0 ? closes[closes.length - 1] : 0;
  const totalReturn = firstClose > 0 ? (lastClose - firstClose) / firstClose * 100 : 0;
  const tradingDays = dailyReturns.length;
  const annualizedReturn = tradingDays > 5 ? (Math.pow(1 + totalReturn / 100, 252 / tradingDays) - 1) * 100 : totalReturn;

  const retMean = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const retVar = dailyReturns.length > 1
    ? dailyReturns.reduce((s, r) => s + (r - retMean) ** 2, 0) / (dailyReturns.length - 1)
    : 0;
  const realizedVol = Math.sqrt(retVar) * Math.sqrt(252) * 100;
  const RISK_FREE = selicRate / 100; // SELIC atual (dinâmica via BCB)
  const sharpe = realizedVol > 0 ? (annualizedReturn / 100 - RISK_FREE) / (realizedVol / 100) : 0;

  const ibovCloses = ibovHistory.filter(d => d.close > 0).map(d => d.close);
  const ibovReturn = ibovCloses.length > 1 ? (ibovCloses[ibovCloses.length - 1] - ibovCloses[0]) / ibovCloses[0] * 100 : null;
  const alpha = ibovReturn !== null ? totalReturn - ibovReturn : null;

  const upDays = validData.filter((d, i) => i > 0 && d.close > validData[i - 1].close).length;
  const downDays = validData.filter((d, i) => i > 0 && d.close < validData[i - 1].close).length;

  const totalDividends = stock.dividendsData?.cashDividends?.reduce((sum: number, d: { rate: number }) => sum + (d.rate || 0), 0) || 0;
  const dividendYield = stock.currentPrice > 0 ? (totalDividends / stock.currentPrice) * 100 : 0;
  const appreciation = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0;

  // ─── Drawdown chart data ─────────────────────────────────────────
  const drawdownData = useMemo(() => {
    let runMax = closes[0] || 1;
    return stock.data.map((item) => {
      if (item.close > 0 && item.close > runMax) runMax = item.close;
      const dd = runMax > 0 && item.close > 0 ? ((item.close - runMax) / runMax) * 100 : 0;
      return { date: formatDateLabel(item.date, timeWindow), drawdown: parseFloat(dd.toFixed(2)) };
    });
  }, [stock.data, closes, timeWindow]);

  const maxDrawdown = drawdownData.length > 0 ? Math.min(...drawdownData.map(d => d.drawdown)) : 0;

  // ─── Monthly volatility chart data ─────────────────────────────
  const monthlyVolData = useMemo(() => {
    if (!['1mo', '3mo', '6mo', '1y', '5y', 'max'].includes(timeWindow)) return [];
    const monthMap: Record<string, number[]> = {};
    for (let i = 1; i < validData.length; i++) {
      const ret = (validData[i].close - validData[i - 1].close) / validData[i - 1].close;
      const key = validData[i].date.substring(0, 7);
      if (!monthMap[key]) monthMap[key] = [];
      monthMap[key].push(ret);
    }
    return Object.entries(monthMap)
      .filter(([, rets]) => rets.length >= 5)
      .map(([month, rets]) => {
        const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
        const variance = rets.length > 1 ? rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1) : 0;
        const vol = Math.sqrt(variance) * Math.sqrt(21) * 100;
        const [year, m] = month.split('-');
        const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return { month: `${months[parseInt(m) - 1]}/${year.slice(2)}`, vol: parseFloat(vol.toFixed(2)) };
      });
  }, [validData, timeWindow]);

  // ─── Annual volatility chart data ────────────────────────────────
  const annualVolData = useMemo(() => {
    if (!['1y', '5y', 'max'].includes(timeWindow)) return [];
    const yearMap: Record<string, number[]> = {};
    for (let i = 1; i < validData.length; i++) {
      const ret = (validData[i].close - validData[i - 1].close) / validData[i - 1].close;
      const year = validData[i].date.substring(0, 4);
      if (!yearMap[year]) yearMap[year] = [];
      yearMap[year].push(ret);
    }
    return Object.entries(yearMap)
      .filter(([, rets]) => rets.length >= 20)
      .map(([year, rets]) => {
        const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
        const variance = rets.length > 1 ? rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1) : 0;
        const vol = Math.sqrt(variance) * Math.sqrt(252) * 100;
        return { year, vol: parseFloat(vol.toFixed(2)) };
      });
  }, [validData, timeWindow]);

  return (
    <div className="space-y-6">
      {/* ── Price Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <InfoCard label="Preco Atual" value={formatBRL(stock.currentPrice)} />
        <InfoCard label="Min 52 Semanas" value={formatBRL(stock.fiftyTwoWeekLow)} valueClass="text-[var(--danger)]" />
        <InfoCard label="Max 52 Semanas" value={formatBRL(stock.fiftyTwoWeekHigh)} valueClass="text-[var(--success)]" />
        <InfoCard label="Dividendos (12M)" value={formatBRL(totalDividends)} valueClass="text-[var(--success)]" />
        <InfoCard label="D.Y. (12M)" value={`${dividendYield.toFixed(2)}%`} />
        <InfoCard
          label={`Valorização (${timeWindow.toUpperCase()})`}
          value={`${appreciation >= 0 ? '+' : ''}${appreciation.toFixed(2)}%`}
          valueClass={appreciation >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}
        />
      </div>

      {/* ── Up/Down Days ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="modern-card p-4 flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">Dias em Alta</span>
          <span className="text-lg font-bold data-value text-[var(--success)]">{upDays}</span>
        </div>
        <div className="modern-card p-4 flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">Dias em Baixa</span>
          <span className="text-lg font-bold data-value text-[var(--danger)]">{downDays}</span>
        </div>
      </div>

      {/* ── Price Chart ──────────────────────────────────────────────── */}
      <div className="modern-card">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
            <h2 className="section-title">Grafico de Precos</h2>
          </div>
          <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1">
            {['1d', '5d', '1mo', '3mo', '6mo', '1y', '5y', 'max'].map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  timeWindow === w
                    ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {w.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Indicator & Comparison Controls */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSMA(!showSMA)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${showSMA ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40' : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'}`}
            >
              SMA
            </button>
            {showSMA && (
              <input
                type="number" value={smaWindow}
                onChange={(e) => setSmaWindow(Math.max(2, Math.min(500, Number(e.target.value) || 20)))}
                className="w-16 px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] text-center"
                min={2} max={500}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEMA(!showEMA)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${showEMA ? 'bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/40' : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'}`}
            >
              EWMA
            </button>
            {showEMA && (
              <input
                type="number" value={emaWindow}
                onChange={(e) => setEmaWindow(Math.max(2, Math.min(500, Number(e.target.value) || 20)))}
                className="w-16 px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] text-center"
                min={2} max={500}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Comparar:</span>
            {comparisonSymbol ? (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/40">
                {comparisonSymbol}
                <button onClick={() => { setComparisonSymbol(''); setComparisonSearch(''); }} className="ml-1 hover:opacity-70">&times;</button>
              </span>
            ) : (
              <div className="relative" ref={compRef}>
                <input
                  type="text" value={comparisonSearch}
                  onChange={(e) => { setComparisonSearch(e.target.value.toUpperCase()); setShowCompDropdown(true); }}
                  onFocus={() => setShowCompDropdown(true)}
                  placeholder="TICKER..."
                  className="w-28 px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                {showCompDropdown && compSearchResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                    {compSearchResults.map((sym) => (
                      <button
                        key={sym}
                        onClick={() => { setComparisonSymbol(sym); setComparisonSearch(''); setShowCompDropdown(false); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface-hover)] transition-colors"
                      >
                        <span className="font-mono font-bold">{sym}</span>
                        <span className="text-[var(--text-muted)] ml-2">{STOCK_NAMES[sym] || ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {comparisonLoading && <div className="w-4 h-4 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />}
          </div>
          {isComparing && <span className="text-[10px] text-[var(--text-muted)]">Retorno normalizado (base 1.0)</span>}
        </div>

        <div className="h-[400px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            {isComparing ? (
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(2)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b0f19', border: '1px solid #1f2937', borderRadius: '0.75rem', fontSize: '0.75rem' }}
                  formatter={(value, name) => {
                    const v = Number(value) || 0;
                    return [`${((v - 1) * 100).toFixed(2)}%`, name];
                  }}
                />
                <Line type="linear" dataKey={stock.symbol} stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="linear" dataKey={comparisonSymbol} stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            ) : (
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#f85149'} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={isPositive ? '#22c55e' : '#f85149'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="price" domain={[priceMin, priceMax]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${v.toFixed(2)}`} />
                <YAxis yAxisId="volume" orientation="right" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => (v > 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}K`)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b0f19', border: '1px solid #1f2937', borderRadius: '0.75rem', fontSize: '0.75rem' }}
                  formatter={(value, name) => {
                    const v = Number(value) || 0;
                    if (name === 'volume') return [v.toLocaleString('pt-BR'), 'Volume'];
                    if (name === 'sma') return [formatBRL(v), `SMA(${smaWindow})`];
                    if (name === 'ema') return [formatBRL(v), `EWMA(${emaWindow})`];
                    return [formatBRL(v), 'Preco'];
                  }}
                />
                <Bar yAxisId="volume" dataKey="volume" fill="var(--accent)" opacity={0.15} radius={[2, 2, 0, 0]} />
                <Area
                  yAxisId="price"
                  type="linear"
                  dataKey="price"
                  stroke={isPositive ? '#22c55e' : '#f85149'}
                  strokeWidth={2}
                  fill="url(#priceGrad)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                {showSMA && (
                  <Line
                    yAxisId="price"
                    type="linear"
                    dataKey="sma"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    name="sma"
                    connectNulls={false}
                  />
                )}
                {showEMA && (
                  <Line
                    yAxisId="price"
                    type="linear"
                    dataKey="ema"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    name="ema"
                    connectNulls={false}
                  />
                )}
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* ── Performance Stats Strip ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-[var(--border)]">
          <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Retorno Total</p>
            <p className={`text-base font-bold data-value mt-0.5 ${totalReturn >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </p>
          </div>
          <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Retorno Anualizado</p>
            <p className={`text-base font-bold data-value mt-0.5 ${annualizedReturn >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {annualizedReturn >= 0 ? '+' : ''}{annualizedReturn.toFixed(2)}%
            </p>
          </div>
          <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Vol. Realizada (a.a.)</p>
            <p className="text-base font-bold data-value mt-0.5 text-[var(--text-primary)]">
              {realizedVol.toFixed(2)}%
            </p>
          </div>
          <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Sharpe Ratio</p>
            <p className={`text-base font-bold data-value mt-0.5 ${sharpe >= 1 ? 'text-[var(--success)]' : sharpe < 0 ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}`}>
              {sharpe.toFixed(2)}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] mt-0.5">rf = Selic {selicRate.toFixed(2)}% a.a.</p>
          </div>
          <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Alpha vs IBOV</p>
            <p className={`text-base font-bold data-value mt-0.5 ${alpha !== null && alpha >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {alpha !== null ? `${alpha >= 0 ? '+' : ''}${alpha.toFixed(2)}%` : '...'}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] mt-0.5">vs BOVA11</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)] flex items-center gap-3">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Max Drawdown</span>
            <span className="text-sm font-bold data-value text-[var(--danger)] ml-auto">{maxDrawdown.toFixed(2)}%</span>
          </div>
          <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)] flex items-center gap-3">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Pregoes na Janela</span>
            <span className="text-sm font-bold data-value text-[var(--text-primary)] ml-auto">{n}</span>
          </div>
        </div>
      </div>

      {/* ── Drawdown Chart ───────────────────────────────────────────── */}
      {drawdownData.length > 2 && (
        <div className="modern-card">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--danger)] rounded-full" />
            <div>
              <h3 className="section-title text-xs">Drawdown</h3>
              <p className="text-[10px] text-[var(--text-muted)]">
                Queda em relacao ao pico historico na janela selecionada &bull; Max Drawdown: <strong className="text-[var(--danger)]">{maxDrawdown.toFixed(2)}%</strong>
              </p>
            </div>
          </div>
          <div className="h-[200px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f85149" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f85149" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b0f19', border: '1px solid #1f2937', borderRadius: '0.75rem', fontSize: '0.75rem' }}
                  formatter={(v: unknown) => [`${Number(v).toFixed(2)}%`, 'Drawdown']}
                />
                <Area type="monotone" dataKey="drawdown" stroke="#f85149" strokeWidth={1.5} fill="url(#ddGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Monthly Volatility ─────────────────────────────────────── */}
      {monthlyVolData.length >= 3 && (
        <div className="modern-card">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--info)] rounded-full" />
            <div>
              <h3 className="section-title text-xs">Volatilidade em Janelas Mensais</h3>
              <p className="text-[10px] text-[var(--text-muted)]">Volatilidade anualizada por mes (desvio padrao dos retornos diarios × √21)</p>
            </div>
          </div>
          <div className="h-[220px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyVolData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b0f19', border: '1px solid #1f2937', borderRadius: '0.75rem', fontSize: '0.75rem' }}
                  formatter={(v: unknown) => [`${Number(v).toFixed(2)}%`, 'Vol. Mensal Anualizada']}
                />
                <Bar dataKey="vol" fill="#3b82f6" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Annual Volatility ──────────────────────────────────────── */}
      {annualVolData.length >= 1 && (
        <div className="modern-card">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--warning)] rounded-full" />
            <div>
              <h3 className="section-title text-xs">Volatilidade em Janelas Anuais</h3>
              <p className="text-[10px] text-[var(--text-muted)]">Volatilidade anualizada por ano (desvio padrao dos retornos diarios × √252)</p>
            </div>
          </div>
          <div className="h-[200px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualVolData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b0f19', border: '1px solid #1f2937', borderRadius: '0.75rem', fontSize: '0.75rem' }}
                  formatter={(v: unknown) => [`${Number(v).toFixed(2)}%`, 'Vol. Anual']}
                />
                <Bar dataKey="vol" fill="#f59e0b" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Trade Idea Charts ─────────────────────────────────────── */}
      <StockTradeIdeas symbol={stock.symbol} currentPrice={stock.currentPrice} />

      {/* ── Historical Daily Table ─────────────────────────────────── */}
      {stock.data.length > 0 && (
        <div className="modern-card">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
            <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
            <h2 className="section-title">Historico Diario</h2>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[var(--bg)]">
                <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)] border-b-2 border-[var(--border)]">
                  <th className="pb-2 text-left">DATA</th>
                  <th className="pb-2 text-right">ADJ CLOSE</th>
                  <th className="pb-2 text-right">CHANGE</th>
                  <th className="pb-2 text-right">% CHANGE</th>
                  <th className="pb-2 text-right">OPEN</th>
                  <th className="pb-2 text-right">LOW</th>
                  <th className="pb-2 text-right">HIGH</th>
                  <th className="pb-2 text-right">CLOSE</th>
                  <th className="pb-2 text-right">VOLUME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {[...stock.data].reverse().map((item, idx) => {
                  const prevClose = idx < stock.data.length - 1 ? [...stock.data].reverse()[idx + 1]?.close : item.open;
                  const change = item.close - (prevClose || item.open);
                  const changePct = prevClose && prevClose > 0 ? (change / prevClose) * 100 : 0;
                  const positive = change >= 0;
                  return (
                    <tr key={idx} className="hover:bg-[var(--surface-hover)] transition-colors">
                      <td className="py-2 text-xs text-[var(--text-secondary)]">{item.fullDate || item.date}</td>
                      <td className="py-2 text-right text-xs data-value text-[var(--text-primary)] font-bold">{formatBRL(item.adjustedClose || item.close)}</td>
                      <td className={`py-2 text-right text-xs data-value font-bold ${positive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{positive ? '+' : ''}{formatBRL(change)}</td>
                      <td className={`py-2 text-right text-xs data-value font-bold ${positive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{positive ? '+' : ''}{changePct.toFixed(2)}%</td>
                      <td className="py-2 text-right text-xs data-value text-[var(--text-secondary)]">{formatBRL(item.open)}</td>
                      <td className="py-2 text-right text-xs data-value text-[var(--danger)]">{formatBRL(item.low)}</td>
                      <td className="py-2 text-right text-xs data-value text-[var(--success)]">{formatBRL(item.high)}</td>
                      <td className="py-2 text-right text-xs data-value text-[var(--text-primary)]">{formatBRL(item.close)}</td>
                      <td className="py-2 text-right text-xs data-value text-[var(--text-muted)]">
                        {item.volume > 1e6 ? `${(item.volume / 1e6).toFixed(1)}M` : item.volume > 1e3 ? `${(item.volume / 1e3).toFixed(0)}K` : item.volume.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── VALUACAO TAB ─── */

function ValuacaoTab({ stock }: { stock: StockDetail }) {
  const fd = stock.financialData || {};
  const ks = stock.defaultKeyStatistics || {};

  // ─── Historical data (oldest first) ────────────────────────────
  const incomeHistory: FundamentalData[] = (
    stock.incomeStatementHistory?.incomeStatementHistory ||
    (Array.isArray(stock.incomeStatementHistory) ? stock.incomeStatementHistory : [])
  ).slice().reverse();

  const cashflowData: FundamentalData[] = (
    stock.cashflowHistory?.cashflowHistory ||
    stock.cashflowHistory?.cashflowStatements ||
    stock.cashflowStatementHistory?.cashflowStatements ||
    (Array.isArray(stock.cashflowHistory) ? stock.cashflowHistory : [])
  ).slice().reverse();

  const balanceHistory: FundamentalData[] = (
    stock.balanceSheetHistory?.balanceSheetHistory ||
    (Array.isArray(stock.balanceSheetHistory) ? stock.balanceSheetHistory : [])
  ).slice().reverse();

  // ─── Index cashflow and balance by year for accurate joining ────
  // BRAPI may return different lengths for each statement; always join by year
  const cfByYear: Record<number, FundamentalData> = {};
  cashflowData.forEach(cf => {
    if (cf.endDate) cfByYear[new Date(cf.endDate).getFullYear()] = cf;
  });
  const balByYear: Record<number, FundamentalData> = {};
  balanceHistory.forEach(bal => {
    if (bal.endDate) balByYear[new Date(bal.endDate).getFullYear()] = bal;
  });
  // Keep sorted years for NWC delta (need previous year)
  const balYears = Object.keys(balByYear).map(Number).sort();

  // ─── Compute historical metrics per year ───────────────────────
  const histMetrics = incomeHistory.map((inc) => {
    const year: number = inc.endDate ? new Date(inc.endDate).getFullYear() : 0;
    // Join by year; fallback to empty object if year not present
    const cf: FundamentalData = (year && cfByYear[year]) ? cfByYear[year] : {};
    const bal: FundamentalData = (year && balByYear[year]) ? balByYear[year] : {};
    const prevYearIdx = balYears.indexOf(year) - 1;
    const prevBal: FundamentalData = prevYearIdx >= 0 ? (balByYear[balYears[prevYearIdx]] || {}) : {};

    const revenue = inc.totalRevenue || 0;
    const cogs = inc.costOfRevenue || 0;
    const grossProfit = inc.grossProfit || (revenue - cogs);
    const ebit = inc.ebit || inc.operatingIncome || 0;
    const incomeBeforeTax = inc.incomeBeforeTax || 0;
    const taxExpense = Math.abs(inc.incomeTaxExpense || 0);
    const effectiveTaxRate = incomeBeforeTax > 0 ? taxExpense / incomeBeforeTax : 0.25;
    const netIncome = inc.netIncome || 0;
    // No BRAPI does NOT have a separate amortization field; the `depreciation` field
    // in Yahoo Finance cashflow = combined Depreciation & Amortization
    const da = Math.abs(cf.depreciation || 0);
    const ebitda = ebit + da;
    // CapEx = capitalExpenditures (reported as negative outflow in Yahoo/BRAPI)
    const capex = Math.abs(cf.capitalExpenditures || 0);

    const curAssets = bal.totalCurrentAssets || 0;
    const curLiab = bal.totalCurrentLiabilities || 0;
    const nwc = curAssets - curLiab;
    const prevNwc = (prevBal.totalCurrentAssets || 0) - (prevBal.totalCurrentLiabilities || 0);
    const chgNwc = prevBal.totalCurrentAssets != null ? nwc - prevNwc : 0;

    const fcff = ebit * (1 - effectiveTaxRate) + da - capex - chgNwc;

    return {
      year: year || `Y`,
      revenue, cogs, grossProfit,
      grossMargin: revenue ? grossProfit / revenue : 0,
      da, daRate: revenue ? da / revenue : 0,
      ebitda, ebitdaMargin: revenue ? ebitda / revenue : 0,
      ebit, ebitMargin: revenue ? ebit / revenue : 0,
      taxExpense, effectiveTaxRate,
      netIncome, netMargin: revenue ? netIncome / revenue : 0,
      capex, capexRate: revenue ? capex / revenue : 0,
      chgNwc, chgNwcRate: revenue ? chgNwc / revenue : 0,
      hasCf: Object.keys(cf).length > 0,
      fcff,
    };
  });

  // ─── Initial projection values from last historical period ──────
  const lastH = histMetrics[histMetrics.length - 1];
  const lastRevenue = lastH?.revenue || fd.totalRevenue || 0;
  const initRevGrowth = parseFloat(((fd.revenueGrowth || 0.05) * 100).toFixed(1));
  const initEbitdaMargin = parseFloat(((lastH?.ebitdaMargin || 0.15) * 100).toFixed(1));
  const initDaRate = parseFloat(((lastH?.daRate || 0.03) * 100).toFixed(1));
  const initCapexRate = parseFloat(((lastH?.capexRate || 0.04) * 100).toFixed(1));
  const initNwcRate = parseFloat(((lastH?.chgNwcRate || 0.01) * 100).toFixed(1));
  const initTaxRate = parseFloat(((lastH?.effectiveTaxRate || 0.25) * 100).toFixed(1));

  const YEARS = 10;

  // ─── State ──────────────────────────────────────────────────────
  const [wacc, setWacc] = useState(10.0);
  const [tgr, setTgr] = useState(3.5);
  const [taxRate, setTaxRate] = useState(initTaxRate);
  const [revenueGrowth, setRevenueGrowth] = useState<number[]>(Array(YEARS).fill(initRevGrowth));
  const [ebitdaMargin, setEbitdaMargin] = useState<number[]>(Array(YEARS).fill(initEbitdaMargin));
  const [daRate, setDaRate] = useState<number[]>(Array(YEARS).fill(initDaRate));
  const [capexRate, setCapexRate] = useState<number[]>(Array(YEARS).fill(initCapexRate));
  const [nwcRate, setNwcRate] = useState<number[]>(Array(YEARS).fill(initNwcRate));

  // ─── Bulk "apply to all years" input state ──────────────────────
  const [bulkRevGrowth, setBulkRevGrowth] = useState('');
  const [bulkEbitdaMargin, setBulkEbitdaMargin] = useState('');
  const [bulkDaRate, setBulkDaRate] = useState('');
  const [bulkCapexRate, setBulkCapexRate] = useState('');
  const [bulkNwcRate, setBulkNwcRate] = useState('');

  // ─── WACC calculator state ───────────────────────────────────────
  const [waccCalcOpen, setWaccCalcOpen] = useState(false);
  const totalMktCap = stock.marketCap || 0;
  const totalDebtCalc = fd.totalDebt || 0;
  const totalCapitalCalc = totalMktCap + totalDebtCalc;
  const initEtoV = totalCapitalCalc > 0 ? parseFloat((totalMktCap / totalCapitalCalc * 100).toFixed(1)) : 60;
  const [wRf, setWRf] = useState(10.75);
  const [wBeta, setWBeta] = useState(parseFloat((ks.beta || 1).toFixed(2)));
  const [wMrp, setWMrp] = useState(5.5);
  const [wKd, setWKd] = useState(12.0);
  const [wDebtTax, setWDebtTax] = useState(initTaxRate);
  const [wEtoV, setWEtoV] = useState(initEtoV);
  const wDtoV = parseFloat((100 - wEtoV).toFixed(1));
  const calcKe = wRf + wBeta * wMrp;
  const calcWaccValue = parseFloat(((wEtoV / 100) * calcKe + (wDtoV / 100) * wKd * (1 - wDebtTax / 100)).toFixed(2));

  type NumArrSetter = (fn: ((p: number[]) => number[]) | number[]) => void;
  type StrSetter = (fn: ((p: string) => string) | string) => void;

  const updateRow = (setter: NumArrSetter, idx: number, val: number) =>
    setter(prev => { const n = [...prev]; n[idx] = val; return n; });

  const applyBulk = (setter: NumArrSetter, val: string, bulkSetter: StrSetter) => {
    const v = parseFloat(val);
    if (!isNaN(v)) setter(Array(YEARS).fill(v));
    bulkSetter(val);
  };

  // ─── Projected cash flows ────────────────────────────────────────
  const projections = useMemo(() => {
    const out = [];
    let prevRev = lastRevenue;
    for (let i = 0; i < YEARS; i++) {
      const rev = prevRev * (1 + revenueGrowth[i] / 100);
      const ebitda = rev * (ebitdaMargin[i] / 100);
      const da = rev * (daRate[i] / 100);
      const ebit = ebitda - da;
      const nopat = ebit * (1 - taxRate / 100);
      const capex = rev * (capexRate[i] / 100);
      const chgNwc = rev * (nwcRate[i] / 100);
      const fcff = nopat + da - capex - chgNwc;
      out.push({ year: new Date().getFullYear() + 1 + i, rev, ebitda, da, ebit, nopat, capex, chgNwc, fcff });
      prevRev = rev;
    }
    return out;
  }, [lastRevenue, revenueGrowth, ebitdaMargin, daRate, capexRate, nwcRate, taxRate]);

  // ─── DCF result ─────────────────────────────────────────────────
  const dcf = useMemo(() => {
    const wD = wacc / 100;
    const tD = tgr / 100;
    if (wD <= tD) return null;
    let pvFcff = 0;
    for (let i = 0; i < projections.length; i++) {
      pvFcff += projections[i].fcff / Math.pow(1 + wD, i + 1);
    }
    const lastFcff = projections[YEARS - 1]?.fcff || 0;
    const tv = lastFcff * (1 + tD) / (wD - tD);
    const pvTv = tv / Math.pow(1 + wD, YEARS);
    const ev = pvFcff + pvTv;
    const cash = fd.totalCash || 0;
    const debt = fd.totalDebt || 0;
    const equityValue = ev + cash - debt;
    const shares = ks.sharesOutstanding || 0;
    const pricePerShare = shares > 0 ? equityValue / shares : 0;
    const upside = stock.currentPrice > 0 ? (pricePerShare - stock.currentPrice) / stock.currentPrice : 0;
    return { pvFcff, tv, pvTv, ev, cash, debt, equityValue, pricePerShare, upside };
  }, [projections, wacc, tgr, fd, ks, stock.currentPrice]);

  // ─── Sensitivity table (5×5 WACC × TGR) ────────────────────────
  const sensitivityData = useMemo(() => {
    const waccSteps = [-2, -1, 0, 1, 2].map(d => wacc + d);
    const tgrSteps = [-2, -1, 0, 1, 2].map(d => tgr + d);
    return tgrSteps.map(tgrVal =>
      waccSteps.map(waccVal => {
        const wD = waccVal / 100;
        const tD = tgrVal / 100;
        if (wD <= tD) return null;
        let pvFcff = 0;
        for (let i = 0; i < projections.length; i++) {
          pvFcff += projections[i].fcff / Math.pow(1 + wD, i + 1);
        }
        const lastFcff = projections[YEARS - 1]?.fcff || 0;
        const tv = lastFcff * (1 + tD) / (wD - tD);
        const pvTv = tv / Math.pow(1 + wD, YEARS);
        const ev = pvFcff + pvTv;
        const shares = ks.sharesOutstanding || 0;
        const eq = ev + (fd.totalCash || 0) - (fd.totalDebt || 0);
        return shares > 0 ? eq / shares : ev;
      })
    );
  }, [projections, wacc, tgr, fd, ks]);

  // ─── Last 5 years only for the historical table ─────────────────
  const displayHist = histMetrics.slice(-5);
  // Show D&A / CapEx rows only when BRAPI actually has cash flow data for ≥1 year
  const hasAnyCf = displayHist.some(m => m.hasCf);
  const hasAnyDa = displayHist.some(m => m.da !== 0);
  const hasAnyCapex = displayHist.some(m => m.capex !== 0);

  const sentColor = (val: number | null, base: number) => {
    if (val === null) return 'bg-[var(--surface)] text-[var(--text-muted)]';
    if (!base) return 'text-[var(--text-primary)]';
    const d = (val - base) / Math.abs(base);
    if (d > 0.2) return 'bg-emerald-500/20 text-emerald-400';
    if (d > 0.05) return 'bg-emerald-500/10 text-emerald-500';
    if (d < -0.2) return 'bg-red-500/20 text-red-400';
    if (d < -0.05) return 'bg-red-500/10 text-red-500';
    return 'bg-[var(--accent)]/10 text-[var(--accent)]';
  };

  const inputCls = 'w-full px-2 py-1 bg-[var(--surface)] border border-[var(--accent)]/20 rounded text-[var(--text-primary)] font-mono text-xs text-center focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] transition-colors';

  return (
    <div className="space-y-6">

      {/* ── TOP BAR ─────────────────────────────────────────────────── */}
      <div className="modern-card">
        <div className="flex flex-wrap items-end gap-6 justify-between">
          {/* Ticker */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Ticker</p>
            <p className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{stock.symbol}</p>
          </div>

          {/* WACC */}
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">WACC</p>
              <button
                onClick={() => setWaccCalcOpen(o => !o)}
                className={`text-[10px] px-2 py-0.5 border rounded-full font-bold transition-all ${waccCalcOpen ? 'bg-[var(--accent)] text-[var(--text-inverse)] border-[var(--accent)]' : 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30 hover:bg-[var(--accent)] hover:text-[var(--text-inverse)]'}`}
              >
                {waccCalcOpen ? '✕ Fechar' : 'Calculadora'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number" step="0.1" min="0" max="100" value={wacc}
                onChange={e => setWacc(parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
              <span className="text-[var(--text-secondary)] font-bold">%</span>
            </div>
          </div>

          {/* TGR */}
          <div className="flex-1 min-w-[180px]">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Terminal Growth Rate</p>
            <div className="flex items-center gap-2">
              <input
                type="number" step="0.1" min="0" max="20" value={tgr}
                onChange={e => setTgr(parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
              <span className="text-[var(--text-secondary)] font-bold">%</span>
            </div>
          </div>

          {/* Tax Rate */}
          <div className="flex-1 min-w-[140px]">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Alíquota IR</p>
            <div className="flex items-center gap-2">
              <input
                type="number" step="0.5" min="0" max="60" value={taxRate}
                onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
              <span className="text-[var(--text-secondary)] font-bold">%</span>
            </div>
          </div>

          {/* Price + Upside */}
          <div className="text-right border-l border-[var(--border)] pl-6">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Preço Justo (DCF)</p>
            <p className="text-3xl font-black text-[var(--text-primary)] font-mono">
              {dcf && dcf.pricePerShare > 0 ? formatBRL(dcf.pricePerShare) : '—'}
            </p>
            {dcf && dcf.pricePerShare > 0 && (
              <>
                <p className={`text-lg font-black mt-0.5 ${dcf.upside >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {dcf.upside >= 0 ? '+' : ''}{(dcf.upside * 100).toFixed(1)}% upside
                </p>
                <p className="text-xs text-[var(--text-muted)]">atual: {formatBRL(stock.currentPrice)}</p>
              </>
            )}
            {!dcf && <p className="text-xs text-[var(--danger)] mt-1">WACC ≤ TGR — inválido</p>}
          </div>
        </div>
      </div>

      {/* ── WACC CALCULATOR ─────────────────────────────────────────── */}
      {waccCalcOpen && (
        <div className="modern-card border border-[var(--accent)]/25 bg-[var(--accent)]/5">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--accent)] rounded-full" />
            <h3 className="section-title text-xs">Calculadora de WACC</h3>
            <span className="text-[10px] text-[var(--text-muted)] ml-1 font-mono">
              WACC = (E/V) × Ke + (D/V) × Kd × (1 − t)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Cost of Equity inputs */}
            <div className="lg:col-span-2 space-y-3 p-3 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Custo do Equity (Ke — CAPM)</p>
              {([
                { label: 'Risk Free Rate (Rf)', val: wRf, set: setWRf, step: 0.25 },
                { label: 'Beta (β)', val: wBeta, set: setWBeta, step: 0.05 },
                { label: 'Market Risk Premium (MRP)', val: wMrp, set: setWMrp, step: 0.25 },
              ] as { label: string; val: number; set: (v: number) => void; step: number }[]).map(f => (
                <div key={f.label}>
                  <p className="text-[10px] text-[var(--text-muted)] mb-1">{f.label}</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" step={f.step} value={f.val}
                      onChange={e => f.set(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40"
                    />
                    {f.label !== 'Beta (β)' && <span className="text-xs text-[var(--text-muted)] shrink-0">%</span>}
                  </div>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-[var(--border)]">
                <p className="text-[10px] text-[var(--text-muted)]">Ke calculado (CAPM)</p>
                <p className="text-lg font-black text-[var(--accent)] font-mono">{calcKe.toFixed(2)}%</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{wRf}% + {wBeta} × {wMrp}%</p>
              </div>
            </div>

            {/* Cost of Debt inputs */}
            <div className="lg:col-span-2 space-y-3 p-3 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Custo da Dívida (Kd)</p>
              {([
                { label: 'Custo da Dívida (Kd)', val: wKd, set: setWKd, step: 0.25 },
                { label: 'Alíquota IR para Kd (t)', val: wDebtTax, set: setWDebtTax, step: 0.5 },
              ] as { label: string; val: number; set: (v: number) => void; step: number }[]).map(f => (
                <div key={f.label}>
                  <p className="text-[10px] text-[var(--text-muted)] mb-1">{f.label}</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" step={f.step} value={f.val}
                      onChange={e => f.set(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40"
                    />
                    <span className="text-xs text-[var(--text-muted)] shrink-0">%</span>
                  </div>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-[var(--border)]">
                <p className="text-[10px] text-[var(--text-muted)]">Kd after-tax</p>
                <p className="text-lg font-black text-[var(--info)] font-mono">{(wKd * (1 - wDebtTax / 100)).toFixed(2)}%</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{wKd}% × (1 − {wDebtTax}%)</p>
              </div>
            </div>

            {/* Capital structure + result */}
            <div className="space-y-3 p-3 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Estrutura de Capital</p>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] mb-1">Mkt Cap (E)</p>
                <p className="text-xs font-mono text-[var(--text-primary)]">{formatLargeNumber(totalMktCap)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] mb-1">Dívida Total (D)</p>
                <p className="text-xs font-mono text-[var(--text-primary)]">{formatLargeNumber(totalDebtCalc)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] mb-1">% Equity (E/V)</p>
                <div className="flex items-center gap-1">
                  <input
                    type="number" step="0.5" min="0" max="100" value={wEtoV}
                    onChange={e => setWEtoV(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40"
                  />
                  <span className="text-xs text-[var(--text-muted)] shrink-0">%</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">% Debt (D/V)</p>
                <p className="text-sm font-black font-mono text-[var(--text-primary)]">{wDtoV.toFixed(1)}%</p>
              </div>
              <div className="border-t border-[var(--border)] pt-3 mt-1">
                <p className="text-[10px] text-[var(--text-muted)]">WACC calculado</p>
                <p className="text-2xl font-black text-[var(--accent)] font-mono">{calcWaccValue.toFixed(2)}%</p>
                <button
                  onClick={() => { setWacc(calcWaccValue); setWaccCalcOpen(false); }}
                  className="mt-2 w-full px-3 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg text-xs font-black hover:opacity-90 transition-opacity"
                >
                  Aplicar ao WACC →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORICAL DATA ─────────────────────────────────────────── */}
      {displayHist.length > 0 && (
        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--info)] rounded-full" />
            <h3 className="section-title text-xs">Histórico — Principais Linhas do FCF</h3>
            <span className="text-[10px] text-[var(--text-muted)] ml-1">(últimos 5 anos)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)] border-b-2 border-[var(--border)]">
                  <th className="pb-2 text-left min-w-[200px]">MÉTRICA</th>
                  {displayHist.map((m, i) => (
                    <th key={i} className="pb-2 text-right min-w-[110px]">{m.year}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {([
                  { label: 'Receita', fn: (m: typeof displayHist[0]) => formatLargeNumber(m.revenue), show: true },
                  { label: 'COGS', fn: (m: typeof displayHist[0]) => formatLargeNumber(m.cogs), show: true },
                  { label: 'Lucro Bruto', fn: (m: typeof displayHist[0]) => formatLargeNumber(m.grossProfit), bold: true, show: true },
                  { label: 'Margem Bruta', fn: (m: typeof displayHist[0]) => `${(m.grossMargin * 100).toFixed(1)}%`, show: true },
                  { label: 'D&A', fn: (m: typeof displayHist[0]) => formatLargeNumber(m.da), show: hasAnyDa },
                  { label: 'EBITDA', fn: (m: typeof displayHist[0]) => formatLargeNumber(m.ebitda), bold: true, show: true },
                  { label: 'Margem EBITDA', fn: (m: typeof displayHist[0]) => `${(m.ebitdaMargin * 100).toFixed(1)}%`, show: true },
                  { label: 'EBIT', fn: (m: typeof displayHist[0]) => formatLargeNumber(m.ebit), bold: true, show: true },
                  { label: 'Margem EBIT', fn: (m: typeof displayHist[0]) => `${(m.ebitMargin * 100).toFixed(1)}%`, show: true },
                  { label: 'IR / Taxes', fn: (m: typeof displayHist[0]) => formatLargeNumber(m.taxExpense), show: true },
                  { label: 'Alíquota Efetiva', fn: (m: typeof displayHist[0]) => `${(m.effectiveTaxRate * 100).toFixed(1)}%`, show: true },
                  { label: 'Lucro Líquido', fn: (m: typeof displayHist[0]) => formatLargeNumber(m.netIncome), bold: true, show: true },
                  { label: 'Margem Líquida', fn: (m: typeof displayHist[0]) => `${(m.netMargin * 100).toFixed(1)}%`, show: true },
                  { label: 'CapEx', fn: (m: typeof displayHist[0]) => formatLargeNumber(m.capex), show: hasAnyCapex },
                  { label: 'Δ NWC', fn: (m: typeof displayHist[0]) => formatLargeNumber(m.chgNwc), show: true },
                  { label: 'FCFF', fn: (m: typeof displayHist[0]) => formatLargeNumber(m.fcff), bold: true, show: true },
                ] as { label: string; fn: (m: typeof displayHist[0]) => string; bold?: boolean; show: boolean }[])
                  .filter(row => row.show)
                  .map(row => (
                  <tr key={row.label} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className={`py-2 text-xs ${row.bold ? 'font-bold text-[var(--text-primary)]' : 'font-semibold text-[var(--text-secondary)]'}`}>{row.label}</td>
                    {displayHist.map((m, i) => (
                      <td key={i} className={`py-2 text-right text-xs data-value ${row.bold ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}>
                        {row.fn(m)}
                      </td>
                    ))}
                  </tr>
                ))}
                {!hasAnyCf && (
                  <tr>
                    <td colSpan={displayHist.length + 1} className="py-3 text-center text-xs text-[var(--text-muted)]">
                      * D&A e CapEx não disponíveis — BRAPI não retornou dados de fluxo de caixa histórico para este ativo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PROJECTION INPUTS ───────────────────────────────────────── */}
      <div className="modern-card">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
          <div className="w-1 h-5 bg-[var(--accent)] rounded-full" />
          <h3 className="section-title text-xs">Simulação — Próximos 10 Anos</h3>
          <span className="text-[10px] text-[var(--text-muted)] ml-1">(premissas editáveis)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)] border-b-2 border-[var(--border)]">
                <th className="pb-2 text-left min-w-[210px]">PREMISSA</th>
                <th className="pb-2 text-center min-w-[90px] border-r border-[var(--border)] pr-2">
                  <span className="text-[var(--accent)]">→ Todos</span>
                </th>
                {Array.from({ length: YEARS }, (_, i) => (
                  <th key={i} className="pb-2 text-center min-w-[80px]">Ano {i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {([
                { label: 'Crescimento Receita (%)', state: revenueGrowth, setter: setRevenueGrowth, step: 0.5, bulk: bulkRevGrowth, setBulk: setBulkRevGrowth },
                { label: 'Margem EBITDA (%)', state: ebitdaMargin, setter: setEbitdaMargin, step: 0.5, bulk: bulkEbitdaMargin, setBulk: setBulkEbitdaMargin },
                { label: 'D&A (% da Receita)', state: daRate, setter: setDaRate, step: 0.1, bulk: bulkDaRate, setBulk: setBulkDaRate },
                { label: 'CapEx (% da Receita)', state: capexRate, setter: setCapexRate, step: 0.1, bulk: bulkCapexRate, setBulk: setBulkCapexRate },
                { label: 'Δ NWC (% da Receita)', state: nwcRate, setter: setNwcRate, step: 0.1, bulk: bulkNwcRate, setBulk: setBulkNwcRate },
              ] as { label: string; state: number[]; setter: NumArrSetter; step: number; bulk: string; setBulk: StrSetter }[]).map(row => (
                <tr key={row.label} className="hover:bg-[var(--surface-hover)] transition-colors">
                  <td className="py-2 text-xs font-semibold text-[var(--text-secondary)]">{row.label}</td>
                  {/* Bulk setter */}
                  <td className="py-1 px-1 border-r border-[var(--border)]">
                    <input
                      type="number"
                      step={row.step}
                      value={row.bulk}
                      placeholder="—"
                      onChange={e => applyBulk(row.setter, e.target.value, row.setBulk)}
                      className={`${inputCls} border-[var(--accent)]/50 bg-[var(--accent)]/5`}
                      title="Aplica o mesmo valor a todos os anos"
                    />
                  </td>
                  {row.state.map((v, i) => (
                    <td key={i} className="py-1 px-1">
                      <input
                        type="number"
                        step={row.step}
                        value={v}
                        onChange={e => updateRow(row.setter, i, parseFloat(e.target.value) || 0)}
                        className={inputCls}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PROJECTED CASH FLOW STATEMENT ───────────────────────────── */}
      <div className="modern-card">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
          <div className="w-1 h-5 bg-[var(--success)] rounded-full" />
          <h3 className="section-title text-xs">Fluxo de Caixa Projetado — FCFF</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)] border-b-2 border-[var(--border)]">
                <th className="pb-2 text-left min-w-[200px]">LINHA</th>
                {projections.map(p => (
                  <th key={p.year} className="pb-2 text-right min-w-[110px]">{p.year}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {([
                { label: 'Receita', fn: (p: typeof projections[0]) => formatLargeNumber(p.rev), bold: true },
                { label: 'EBITDA', fn: (p: typeof projections[0]) => formatLargeNumber(p.ebitda), bold: true },
                { label: '(−) D&A', fn: (p: typeof projections[0]) => `(${formatLargeNumber(p.da)})` },
                { label: 'EBIT', fn: (p: typeof projections[0]) => formatLargeNumber(p.ebit), bold: true },
                { label: `NOPAT = EBIT × (1 − ${taxRate}%)`, fn: (p: typeof projections[0]) => formatLargeNumber(p.nopat) },
                { label: '(+) D&A', fn: (p: typeof projections[0]) => formatLargeNumber(p.da) },
                { label: '(−) CapEx', fn: (p: typeof projections[0]) => `(${formatLargeNumber(p.capex)})` },
                { label: '(−) Δ NWC', fn: (p: typeof projections[0]) => `(${formatLargeNumber(p.chgNwc)})` },
                { label: 'FCFF', fn: (p: typeof projections[0]) => formatLargeNumber(p.fcff), bold: true, highlight: true },
              ] as { label: string; fn: (p: typeof projections[0]) => string; bold?: boolean; highlight?: boolean }[]).map(row => (
                <tr
                  key={row.label}
                  className={`transition-colors ${row.highlight ? 'border-t-2 border-[var(--border)] bg-[var(--surface)]/40' : 'hover:bg-[var(--surface-hover)]'}`}
                >
                  <td className={`py-2 text-xs ${row.bold ? 'font-bold text-[var(--text-primary)]' : 'font-semibold text-[var(--text-secondary)]'}`}>{row.label}</td>
                  {projections.map(p => (
                    <td
                      key={p.year}
                      className={`py-2 text-right text-xs data-value ${
                        row.highlight
                          ? (p.fcff >= 0 ? 'text-[var(--success)] font-black' : 'text-[var(--danger)] font-black')
                          : row.bold
                          ? 'text-[var(--text-primary)] font-bold'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {row.fn(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── VALUATION RESULT + CAPITAL STRUCTURE ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DCF Bridge */}
        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--accent)] rounded-full" />
            <h3 className="section-title text-xs">Resultado DCF — Ponte de Valor</h3>
          </div>
          {dcf ? (
            <div className="space-y-1">
              <MetricRow label="PV dos FCFFs (10 anos)" value={formatLargeNumber(dcf.pvFcff)} />
              <MetricRow label={`Valor Terminal (TGR: ${tgr}%)`} value={formatLargeNumber(dcf.tv)} />
              <MetricRow label="PV do Valor Terminal" value={formatLargeNumber(dcf.pvTv)} />
              <div className="border-t-2 border-[var(--border)] pt-2 mt-2">
                <MetricRow label="Enterprise Value (EV)" value={formatLargeNumber(dcf.ev)} />
              </div>
              <MetricRow label="(+) Caixa & Equivalentes" value={formatLargeNumber(dcf.cash)} />
              <MetricRow label="(−) Dívida Total" value={`(${formatLargeNumber(dcf.debt)})`} />
              <div className="border-t-2 border-[var(--border)] pt-2 mt-2">
                <MetricRow label="Equity Value" value={formatLargeNumber(dcf.equityValue)} />
              </div>
              {ks.sharesOutstanding > 0 && (
                <>
                  <MetricRow label="Ações em Circulação" value={formatLargeNumber(ks.sharesOutstanding, '')} />
                  <div className="border-t-2 border-[var(--border)] pt-2 mt-2">
                    <MetricRow label="Preço Justo / Ação" value={formatBRL(dcf.pricePerShare)} />
                  </div>
                  <div className={`flex items-center justify-between py-3 rounded-xl px-4 mt-3 ${dcf.upside >= 0 ? 'bg-[var(--success)]/10 border border-[var(--success)]/20' : 'bg-[var(--danger)]/10 border border-[var(--danger)]/20'}`}>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Upside / Downside vs atual</p>
                      <p className="text-xs text-[var(--text-muted)]">{formatBRL(stock.currentPrice)} → {formatBRL(dcf.pricePerShare)}</p>
                    </div>
                    <span className={`text-2xl font-black ${dcf.upside >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                      {dcf.upside >= 0 ? '+' : ''}{(dcf.upside * 100).toFixed(1)}%
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--danger)] text-center py-8">WACC deve ser maior que o TGR.</p>
          )}
        </div>

        {/* Capital Structure */}
        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--info)] rounded-full" />
            <h3 className="section-title text-xs">Estrutura de Capital</h3>
          </div>
          <div className="space-y-1">
            <MetricRow label="Caixa & Equivalentes" value={formatLargeNumber(fd.totalCash)} />
            <MetricRow label="Dívida Total" value={formatLargeNumber(fd.totalDebt)} />
            <MetricRow label="Dívida Líquida" value={formatLargeNumber((fd.totalDebt || 0) - (fd.totalCash || 0))} />
            <MetricRow label="Patrimônio Líquido (Equity)" value={formatLargeNumber(fd.totalStockholderEquity || ks.bookValue)} />
            <div className="border-t border-[var(--border)] pt-1 mt-1">
              <MetricRow label="Market Cap" value={formatLargeNumber(stock.marketCap)} />
              <MetricRow label="EV (Referência de Mercado)" value={formatLargeNumber(ks.enterpriseValue)} />
            </div>
            <div className="border-t border-[var(--border)] pt-1 mt-1">
              <MetricRow label="Dívida / EBITDA" value={fd.ebitda ? formatNumber((fd.totalDebt || 0) / fd.ebitda) : '-'} />
              <MetricRow label="Dívida / Equity" value={formatNumber(fd.debtToEquity)} />
              <MetricRow label="Ações em Circulação" value={formatLargeNumber(ks.sharesOutstanding, '')} />
            </div>
          </div>
        </div>
      </div>

      {/* ── SENSITIVITY TABLE ───────────────────────────────────────── */}
      <div className="modern-card">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
          <div className="w-1 h-5 bg-yellow-500 rounded-full" />
          <h3 className="section-title text-xs">Análise de Sensibilidade — Preço por Ação</h3>
          <span className="text-[10px] text-[var(--text-muted)] ml-1">WACC (colunas) × TGR (linhas)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="p-3 text-center border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] font-black text-[10px]">
                  TGR ↓ / WACC →
                </th>
                {[-2, -1, 0, 1, 2].map(d => (
                  <th
                    key={d}
                    className={`p-3 text-center border border-[var(--border)] font-black text-[10px] ${d === 0 ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'bg-[var(--surface)] text-[var(--text-muted)]'}`}
                  >
                    {(wacc + d).toFixed(1)}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivityData.map((row, ri) => (
                <tr key={ri}>
                  <td
                    className={`p-3 text-center border border-[var(--border)] font-black text-[10px] ${ri === 2 ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'bg-[var(--surface)] text-[var(--text-muted)]'}`}
                  >
                    {(tgr + (ri - 2)).toFixed(1)}%
                  </td>
                  {row.map((val, ci) => {
                    const isCenter = ri === 2 && ci === 2;
                    const base = dcf?.pricePerShare || 0;
                    return (
                      <td
                        key={ci}
                        className={`p-3 text-center border border-[var(--border)] font-mono ${isCenter ? 'ring-2 ring-inset ring-[var(--accent)] font-black' : ''} ${sentColor(val, base)}`}
                      >
                        {val !== null ? formatBRL(val) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-[var(--text-muted)] mt-3">
            * Preço justo por ação (R$). Centro = WACC {wacc.toFixed(1)}% / TGR {tgr.toFixed(1)}% (destacado). Verde = acima do cenário base · Vermelho = abaixo.
          </p>
        </div>
      </div>

    </div>
  );
}
