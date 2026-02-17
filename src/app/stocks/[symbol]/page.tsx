'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import MarketTickerBar from '@/components/MarketTickerBar';
import { getStockLogoUrl, getStockInitials } from '@/lib/stock-logos';
import {
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Bar,
  ComposedChart,
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

  return (
    <div className="space-y-6">
      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <InfoCard label="Market Cap" value={formatLargeNumber(stock.marketCap)} />
        <InfoCard label="Volume Medio (10d)" value={formatLargeNumber(stock.averageDailyVolume10Day)} />
        <InfoCard label="Beta" value={formatNumber(ks.beta)} />
        <InfoCard label="Setor" value={sp.sector || '-'} />
        <InfoCard label="Industria" value={sp.industry || '-'} />
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
            <MetricRow label="Receita Total" value={formatLargeNumber(fd.totalRevenue)} />
            <MetricRow label="Crescimento Receita" value={formatPercent(fd.revenueGrowth)} />
            <MetricRow label="Lucro Bruto" value={formatLargeNumber(fd.grossProfits)} />
            <MetricRow label="EBITDA" value={formatLargeNumber(fd.ebitda)} />
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

      {/* Calendar Events */}
      {stock.calendarEvents && (
        <div className="modern-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
            <div className="w-1 h-5 bg-[var(--accent)] rounded-full" />
            <h3 className="section-title text-xs">Calendario de Eventos</h3>
          </div>
          {stock.calendarEvents.earnings ? (
            <div className="space-y-2">
              {stock.calendarEvents.earnings.earningsDate?.map((d: string, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-b-0">
                  <span className="text-sm text-[var(--text-secondary)]">Earnings</span>
                  <span className="text-sm font-bold data-value text-[var(--text-primary)]">
                    {new Date(d).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Nenhum evento agendado</p>
          )}
        </div>
      )}

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
  const chartData = stock.data.map((item) => ({
    date: item.date,
    fullDate: item.fullDate,
    price: item.close,
    volume: item.volume,
    high: item.high,
    low: item.low,
    open: item.open,
    adjustedClose: item.adjustedClose || item.close,
  }));

  // Compute Y-axis bounds (98% of min, 102% of max)
  const chartPrices = chartData.map((d) => d.price).filter((p) => p > 0);
  const priceMin = chartPrices.length > 0 ? Math.min(...chartPrices) * 0.98 : 0;
  const priceMax = chartPrices.length > 0 ? Math.max(...chartPrices) * 1.02 : 0;

  // Compute stats
  const closes = stock.data.map((d) => d.close).filter((c) => c > 0);
  const upDays = stock.data.filter((d, i) => i > 0 && d.close > stock.data[i - 1].close).length;
  const downDays = stock.data.filter((d, i) => i > 0 && d.close < stock.data[i - 1].close).length;

  // Compute 12M appreciation
  const firstClose = closes.length > 0 ? closes[0] : 0;
  const lastClose = closes.length > 0 ? closes[closes.length - 1] : 0;
  const appreciation = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0;

  // Dividends info
  const totalDividends = stock.dividendsData?.cashDividends?.reduce(
    (sum: number, d: { rate: number }) => sum + (d.rate || 0),
    0
  ) || 0;
  const dividendYield = stock.currentPrice > 0 ? (totalDividends / stock.currentPrice) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Price Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <InfoCard label="Preco Atual" value={formatBRL(stock.currentPrice)} />
        <InfoCard label="Min 52 Semanas" value={formatBRL(stock.fiftyTwoWeekLow)} valueClass="text-[var(--danger)]" />
        <InfoCard label="Max 52 Semanas" value={formatBRL(stock.fiftyTwoWeekHigh)} valueClass="text-[var(--success)]" />
        <InfoCard label="Dividendos (12M)" value={formatBRL(totalDividends)} valueClass="text-[var(--success)]" />
        <InfoCard label="D.Y. (12M)" value={`${dividendYield.toFixed(2)}%`} />
        <InfoCard label={`Valorizacao (${timeWindow.toUpperCase()})`} value={`${appreciation >= 0 ? '+' : ''}${appreciation.toFixed(2)}%`} valueClass={appreciation >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'} />
      </div>

      {/* Up/Down Days */}
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

      {/* Price Chart */}
      <div className="modern-card">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
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
        <div className="h-[400px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#f85149'} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={isPositive ? '#22c55e' : '#f85149'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="price"
                domain={[priceMin, priceMax]}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `R$ ${v.toFixed(2)}`}
              />
              <YAxis
                yAxisId="volume"
                orientation="right"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v > 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}K`)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0b0f19',
                  border: '1px solid #1f2937',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                }}
                formatter={(value, name) => {
                  const v = Number(value) || 0;
                  if (name === 'volume') return [v.toLocaleString('pt-BR'), 'Volume'];
                  return [formatBRL(v), 'Preco'];
                }}
              />
              <Bar yAxisId="volume" dataKey="volume" fill="var(--accent)" opacity={0.15} radius={[2, 2, 0, 0]} />
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke={isPositive ? '#22c55e' : '#f85149'}
                strokeWidth={2}
                fill="url(#priceGrad)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Daily Table */}
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
                      <td className="py-2 text-right text-xs data-value text-[var(--text-primary)] font-bold">
                        {formatBRL(item.adjustedClose || item.close)}
                      </td>
                      <td className={`py-2 text-right text-xs data-value font-bold ${positive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {positive ? '+' : ''}{formatBRL(change)}
                      </td>
                      <td className={`py-2 text-right text-xs data-value font-bold ${positive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {positive ? '+' : ''}{changePct.toFixed(2)}%
                      </td>
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
