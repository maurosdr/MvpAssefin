'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  calculateFixedIncome,
  TESOURO_PRESETS,
  formatBRL,
  formatPercent,
  type IndexerType,
  type FixedIncomeInput,
  type FixedIncomeResult,
} from '@/lib/fixed-income-calc';

// ── Indexer tab config ──────────────────────────────────────────────
const INDEXER_TABS: { type: IndexerType; label: string; placeholder: string; unit: string }[] = [
  { type: 'cdi-plus',   label: 'CDI+',       placeholder: '2.0',  unit: '% a.a.' },
  { type: 'pct-cdi',    label: '% CDI',      placeholder: '110',  unit: '%' },
  { type: 'pre-fixado', label: 'Pré-fixado', placeholder: '14.5', unit: '% a.a.' },
  { type: 'ipca-plus',  label: 'IPCA+',      placeholder: '6.5',  unit: '% a.a.' },
];

// ── IR bracket helper ───────────────────────────────────────────────
function getIRBracketLabel(days: number): string {
  if (days <= 180) return 'Até 180 dias — 22,5%';
  if (days <= 360) return '181–360 dias — 20%';
  if (days <= 720) return '361–720 dias — 17,5%';
  return 'Acima de 720 dias — 15%';
}

// ── Market-rates type ───────────────────────────────────────────────
interface MarketRates {
  selic: number;
  cdi: number;
  ipca: number;
  lastUpdated: string;
}

// ── Component ───────────────────────────────────────────────────────
export default function FixedIncomeCalculator() {
  // Market rates
  const [rates, setRates] = useState<MarketRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Form state
  const [indexerType, setIndexerType] = useState<IndexerType>('pct-cdi');
  const [principal, setPrincipal] = useState('10000');
  const [rate, setRate] = useState('100');
  const [investmentDate, setInvestmentDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [maturityDate, setMaturityDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });

  // ── Fetch market rates ────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/market/rates')
      .then((r) => r.json())
      .then((d: MarketRates) => setRates(d))
      .catch(() => setRates(null))
      .finally(() => setRatesLoading(false));
  }, []);

  // ── Apply Tesouro preset ──────────────────────────────────────────
  const applyPreset = useCallback((presetType: string) => {
    const preset = TESOURO_PRESETS.find((p) => p.type === presetType);
    if (!preset) return;
    setIndexerType(preset.indexerType);
    setRate(String(preset.defaultSpread));
  }, []);

  // ── Compute result ────────────────────────────────────────────────
  const result: FixedIncomeResult | null = useMemo(() => {
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    if (!p || p <= 0 || isNaN(r)) return null;
    if (!rates) return null;
    const inv = new Date(investmentDate + 'T00:00:00');
    const mat = new Date(maturityDate + 'T00:00:00');
    if (isNaN(inv.getTime()) || isNaN(mat.getTime()) || mat <= inv) return null;

    const input: FixedIncomeInput = {
      principal: p,
      rate: r,
      indexerType,
      investmentDate: inv,
      maturityDate: mat,
      currentCDI: rates.cdi,
      currentIPCA: rates.ipca,
    };

    try {
      return calculateFixedIncome(input);
    } catch {
      return null;
    }
  }, [principal, rate, indexerType, investmentDate, maturityDate, rates]);

  // ── Active tab config ─────────────────────────────────────────────
  const activeTab = INDEXER_TABS.find((t) => t.type === indexerType)!;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text)]">Calculadora de Renda Fixa</h2>
            <p className="text-xs text-[var(--text-muted)]">Simule investimentos em renda fixa</p>
          </div>
        </div>
      </div>

      {/* ── Rate badges ────────────────────────────────────────── */}
      {ratesLoading ? (
        <div className="flex items-center gap-2 mb-5">
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--text-muted)]">Carregando taxas...</span>
        </div>
      ) : rates ? (
        <div className="flex flex-wrap gap-2 mb-5">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
            Selic {formatPercent(rates.selic)}
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
            CDI {formatPercent(rates.cdi)}
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium">
            IPCA {formatPercent(rates.ipca)}
          </span>
          {rates.lastUpdated && (
            <span className="text-[10px] text-[var(--text-muted)] self-center ml-1">
              Atualizado: {new Date(rates.lastUpdated).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-red-400 mb-5">Erro ao carregar taxas de mercado</p>
      )}

      {/* ── Indexer tabs ───────────────────────────────────────── */}
      <div className="flex gap-1 mb-4 bg-gray-900/50 rounded-lg p-1">
        {INDEXER_TABS.map((tab) => (
          <button
            key={tab.type}
            onClick={() => {
              setIndexerType(tab.type);
              setRate(tab.placeholder);
            }}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
              indexerType === tab.type
                ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tesouro Direto presets ─────────────────────────────── */}
      <div className="mb-5">
        <p className="text-[11px] text-[var(--text-muted)] mb-2 uppercase tracking-wide font-medium">
          Tesouro Direto
        </p>
        <div className="flex flex-wrap gap-2">
          {TESOURO_PRESETS.map((preset) => (
            <button
              key={preset.type}
              onClick={() => applyPreset(preset.type)}
              title={preset.description}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:border-green-500/40 hover:text-green-400 hover:bg-green-500/5 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input fields ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Principal */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">
            Valor investido (R$)
          </label>
          <input
            type="number"
            min="0"
            step="100"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="10000"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-sm text-[var(--text)] placeholder:text-gray-500 focus:outline-none focus:border-green-500/50 transition-colors"
          />
        </div>

        {/* Rate / Spread */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">
            Taxa / Spread ({activeTab.unit})
          </label>
          <input
            type="number"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder={activeTab.placeholder}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-sm text-[var(--text)] placeholder:text-gray-500 focus:outline-none focus:border-green-500/50 transition-colors"
          />
        </div>

        {/* Investment date */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">
            Data de investimento
          </label>
          <input
            type="date"
            value={investmentDate}
            onChange={(e) => setInvestmentDate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-sm text-[var(--text)] focus:outline-none focus:border-green-500/50 transition-colors"
          />
        </div>

        {/* Maturity date */}
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">
            Data de vencimento
          </label>
          <input
            type="date"
            value={maturityDate}
            onChange={(e) => setMaturityDate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-sm text-[var(--text)] focus:outline-none focus:border-green-500/50 transition-colors"
          />
        </div>
      </div>

      {/* ── Results ────────────────────────────────────────────── */}
      {result ? (
        <div className="bg-gray-900/40 border border-[var(--border)] rounded-xl p-5">
          {/* IR bracket badge */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[var(--text)]">Resultado da Simulacao</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              IR: {getIRBracketLabel(result.holdingDays)}
            </span>
          </div>

          {/* Holding info */}
          <div className="flex flex-wrap gap-4 mb-4 text-xs text-[var(--text-muted)]">
            <span>Dias corridos: <strong className="text-[var(--text)]">{result.holdingDays}</strong></span>
            <span>Dias uteis: <strong className="text-[var(--text)]">{result.businessDays}</strong></span>
            <span>Taxa efetiva a.a.: <strong className="text-green-400">{formatPercent(result.effectiveAnnualRate)}</strong></span>
          </div>

          {/* Two-column results */}
          <div className="grid grid-cols-2 gap-4">
            {/* Gross column */}
            <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-4">
              <p className="text-[11px] text-green-400 font-semibold uppercase tracking-wide mb-3">Bruto</p>
              <p className="text-xl font-bold text-green-400 mb-1">{formatBRL(result.finalGrossValue)}</p>
              <p className="text-xs text-[var(--text-muted)]">
                Rendimento: <span className="text-green-400 font-medium">{formatBRL(result.grossReturn)}</span>
              </p>
            </div>

            {/* Net column */}
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4">
              <p className="text-[11px] text-blue-400 font-semibold uppercase tracking-wide mb-3">Liquido</p>
              <p className="text-xl font-bold text-blue-400 mb-1">{formatBRL(result.finalNetValue)}</p>
              <p className="text-xs text-[var(--text-muted)]">
                Rendimento: <span className="text-blue-400 font-medium">{formatBRL(result.netReturn)}</span>
              </p>
            </div>
          </div>

          {/* Deductions */}
          <div className="mt-4 pt-4 border-t border-[var(--border)]/40">
            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide font-medium mb-3">
              Deducoes
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs text-[var(--text-muted)] mb-1">IR ({formatPercent(result.irRate * 100, 1)})</p>
                <p className="text-sm font-semibold text-red-400">{formatBRL(result.irAmount)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[var(--text-muted)] mb-1">IOF</p>
                <p className="text-sm font-semibold text-red-400">{formatBRL(result.iofAmount)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[var(--text-muted)] mb-1">Custodia B3</p>
                <p className="text-sm font-semibold text-red-400">{formatBRL(result.custodyFee)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900/40 border border-[var(--border)] rounded-xl p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            {!rates
              ? 'Aguardando taxas de mercado...'
              : 'Preencha os campos acima para simular o investimento'}
          </p>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────── */}
      <p className="text-[10px] text-[var(--text-muted)] mt-4">
        Simulacao com base em taxas atuais. Valores sujeitos a variacao. Convencao: 252 dias uteis / ano.
      </p>
    </div>
  );
}
