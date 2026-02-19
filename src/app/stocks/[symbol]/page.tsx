'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import { getStockLogoUrl, getStockInitials } from '@/lib/stock-logos';
import { MAIN_STOCKS, STOCK_NAMES } from '@/lib/stocks-data';
import { calculateSMA, calculateEMA } from '@/lib/indicators';
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
type StockTab = 'sumario' | 'contabil' | 'multiplos' | 'historico';

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
              <p className="text-[var(--text-muted)] mb-4">Acao nao encontrada</p>
              <button
                onClick={() => router.push('/stocks')}
                className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg font-semibold hover:bg-[var(--accent-hover)] transition-colors"
              >
                Voltar para Acoes
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isPositive = stock.changePercent >= 0;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
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
              {getStockLogoUrl(symbol) && !logoError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getStockLogoUrl(symbol)}
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
          <div className="text-right">
            <div className="data-value text-3xl font-bold text-[var(--text-primary)] mb-1">
              {stock.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className={`data-value text-xl font-semibold ${isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}% ({isPositive ? '+' : ''}
              {stock.change.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-2 bg-[var(--surface)]/60 border border-[var(--border)] rounded-2xl p-1.5 overflow-x-auto sticky top-[120px] z-30 backdrop-blur-sm">
          {([
            { key: 'sumario', label: 'Sumario', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            { key: 'contabil', label: 'Contabil', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            { key: 'multiplos', label: 'Multiplos e Indices', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
            { key: 'historico', label: 'Historico', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
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
        {activeTab === 'historico' && (
          <HistoricoTab stock={stock} timeWindow={timeWindow} setTimeWindow={setTimeWindow} />
        )}
      </main>
    </div>
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
            <p className="text-sm text-[var(--text-muted)]">Dados de acionistas nao disponiveis</p>
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
        <p className="text-[var(--text-muted)]">Dados contabeis nao disponiveis para esta acao.</p>
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
            <h3 className="section-title text-xs">DRE - Demonstracao do Resultado</h3>
          </div>
          <FinancialTable
            data={incomeHistory}
            fields={[
              { key: 'totalRevenue', label: 'Receita Total' },
              { key: 'costOfRevenue', label: 'Custo da Receita' },
              { key: 'grossProfit', label: 'Lucro Bruto' },
              { key: 'totalOperatingExpenses', label: 'Despesas Operacionais' },
              { key: 'operatingIncome', label: 'Lucro Operacional' },
              { key: 'incomeBeforeTax', label: 'Lucro antes IR' },
              { key: 'incomeTaxExpense', label: 'IR' },
              { key: 'netIncome', label: 'Lucro Liquido' },
              { key: 'ebit', label: 'EBIT' },
            ]}
          />
        </div>
      )}

      {/* Balance Sheet */}
      {balanceHistory.length > 0 && (
        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--info)] rounded-full" />
            <h3 className="section-title text-xs">Balanco Patrimonial</h3>
          </div>
          <FinancialTable
            data={balanceHistory}
            fields={[
              { key: 'totalAssets', label: 'Ativo Total' },
              { key: 'totalCurrentAssets', label: 'Ativo Circulante' },
              { key: 'cash', label: 'Caixa' },
              { key: 'shortTermInvestments', label: 'Invest. Curto Prazo' },
              { key: 'netReceivables', label: 'Recebiveis' },
              { key: 'inventory', label: 'Estoque' },
              { key: 'totalLiab', label: 'Passivo Total' },
              { key: 'totalCurrentLiabilities', label: 'Passivo Circulante' },
              { key: 'longTermDebt', label: 'Divida Longo Prazo' },
              { key: 'totalStockholderEquity', label: 'Patrimonio Liquido' },
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
              { key: 'operatingCashFlow', label: 'FCO - Operacional' },
              { key: 'totalCashFromOperatingActivities', label: 'FCO - Operacional (alt)' },
              { key: 'capitalExpenditures', label: 'CAPEX' },
              { key: 'totalCashflowsFromInvestingActivities', label: 'FCO - Investimentos' },
              { key: 'totalCashFromFinancingActivities', label: 'FCO - Financiamento' },
              { key: 'changeInCash', label: 'Variacao de Caixa' },
              { key: 'netIncome', label: 'Lucro Liquido' },
              { key: 'netIncomeBeforeTaxes', label: 'Lucro antes IR' },
              { key: 'depreciation', label: 'Depreciacao' },
              { key: 'adjustmentsToProfitOrLoss', label: 'Ajustes ao Lucro' },
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
  fields: { key: string; label: string }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)] border-b-2 border-[var(--border)]">
            <th className="pb-2 text-left min-w-[180px]">ITEM</th>
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
            <tr key={field.key} className="hover:bg-[var(--surface-hover)] transition-colors">
              <td className="py-2 text-xs font-semibold text-[var(--text-secondary)]">{field.label}</td>
              {data.map((item: FundamentalData, i: number) => (
                <td key={i} className="py-2 text-right text-xs data-value text-[var(--text-primary)]">
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
  const RISK_FREE = 0.105; // Selic ~10.5% p.a.
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
          label={`Valorizacao (${timeWindow.toUpperCase()})`}
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
                <Line type="monotone" dataKey={stock.symbol} stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey={comparisonSymbol} stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
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
                <Area yAxisId="price" type="monotone" dataKey="price" stroke={isPositive ? '#22c55e' : '#f85149'} strokeWidth={2} fill="url(#priceGrad)" dot={false} activeDot={{ r: 4 }} />
                {showSMA && (
                  <Line yAxisId="price" type="monotone" dataKey="sma" stroke="#f59e0b" strokeWidth={2} dot={false} name="sma" connectNulls={false} />
                )}
                {showEMA && (
                  <Line yAxisId="price" type="monotone" dataKey="ema" stroke="#8b5cf6" strokeWidth={2} dot={false} name="ema" connectNulls={false} />
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
            <p className="text-[9px] text-[var(--text-muted)] mt-0.5">rf = Selic 10.5% a.a.</p>
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
