'use client';

import { useState, useEffect } from 'react';

interface FocusExpectation {
  indicator: string;
  date: string;
  referenceDate: string;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  stddev: number | null;
}

interface FocusData {
  annual: FocusExpectation[];
  monthly: FocusExpectation[];
  updatedAt: string;
}

const INDICATOR_CONFIG: Record<
  string,
  { label: string; unit: string; color: string; decimals: number }
> = {
  IPCA:       { label: 'IPCA',    unit: '%',  color: 'text-orange-400', decimals: 2 },
  'PIB Total':{ label: 'PIB',     unit: '%',  color: 'text-blue-400',   decimals: 2 },
  Selic:      { label: 'Selic',   unit: '%',  color: 'text-green-400',  decimals: 2 },
  'Câmbio':   { label: 'Câmbio',  unit: 'R$', color: 'text-yellow-400', decimals: 2 },
};

type TabType = 'annual' | 'monthly';

function formatRefDate(ref: string, type: TabType): string {
  if (type === 'annual') return ref; // already YYYY
  // monthly is YYYY-MM
  const [y, m] = ref.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[parseInt(m, 10) - 1]}/${y?.slice(2)}`;
}

function formatValue(v: number | null, unit: string, decimals: number): string {
  if (v == null) return '–';
  const formatted = v.toFixed(decimals);
  return unit === 'R$' ? `R$ ${formatted}` : `${formatted}%`;
}

export default function FocusCard() {
  const [data, setData] = useState<FocusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('annual');
  const [activeIndicator, setActiveIndicator] = useState('IPCA');

  useEffect(() => {
    fetch('/api/market/focus')
      .then((r) => r.json())
      .then((d: FocusData) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const indicators = tab === 'annual'
    ? ['IPCA', 'PIB Total', 'Selic', 'Câmbio']
    : ['IPCA', 'Selic'];

  const expectations = (tab === 'annual' ? data?.annual : data?.monthly) ?? [];
  const filtered = expectations
    .filter((e) => e.indicator === activeIndicator)
    .slice(0, tab === 'annual' ? 5 : 6);

  const config = INDICATOR_CONFIG[activeIndicator] ?? {
    label: activeIndicator, unit: '%', color: 'text-gray-400', decimals: 2,
  };

  // Ensure active indicator is valid for current tab
  const validIndicators = tab === 'annual'
    ? ['IPCA', 'PIB Total', 'Selic', 'Câmbio']
    : ['IPCA', 'Selic'];

  const handleTabChange = (newTab: TabType) => {
    setTab(newTab);
    const newValid = newTab === 'annual'
      ? ['IPCA', 'PIB Total', 'Selic', 'Câmbio']
      : ['IPCA', 'Selic'];
    if (!newValid.includes(activeIndicator)) setActiveIndicator(newValid[0]);
  };

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text)]">Focus – BCB</h2>
            <p className="text-xs text-[var(--text-muted)]">Expectativas do Mercado</p>
          </div>
        </div>
        {data?.updatedAt && (
          <span className="text-[10px] text-[var(--text-muted)]">
            {new Date(data.updatedAt).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>

      {/* Tab: Anual / Mensal */}
      <div className="flex gap-1 mb-4 bg-gray-900/50 rounded-lg p-1">
        {(['annual', 'monthly'] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
              tab === t
                ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {t === 'annual' ? 'Anual' : 'Mensal'}
          </button>
        ))}
      </div>

      {/* Indicator pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {validIndicators.map((ind) => {
          const cfg = INDICATOR_CONFIG[ind];
          const isActive = activeIndicator === ind;
          return (
            <button
              key={ind}
              onClick={() => setActiveIndicator(ind)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                isActive
                  ? `${cfg?.color ?? 'text-gray-400'} border-current bg-current/10`
                  : 'text-[var(--text-muted)] border-[var(--border)] hover:border-gray-500'
              }`}
            >
              {cfg?.label ?? ind}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-[var(--text-muted)] text-sm py-6">Sem dados disponíveis</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--text-muted)] text-xs border-b border-[var(--border)]">
                <th className="text-left pb-2 font-medium">
                  {tab === 'annual' ? 'Ano' : 'Mês'}
                </th>
                <th className="text-right pb-2 font-medium">Mediana</th>
                <th className="text-right pb-2 font-medium">Média</th>
                <th className="text-right pb-2 font-medium">Mín</th>
                <th className="text-right pb-2 font-medium">Máx</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((exp, idx) => (
                <tr
                  key={`${exp.referenceDate}-${idx}`}
                  className="border-b border-[var(--border)]/40 hover:bg-white/[0.02] transition-colors"
                >
                  <td className={`py-2 font-semibold ${config.color}`}>
                    {formatRefDate(exp.referenceDate, tab)}
                  </td>
                  <td className="py-2 text-right text-[var(--text)] font-medium">
                    {formatValue(exp.median, config.unit, config.decimals)}
                  </td>
                  <td className="py-2 text-right text-[var(--text-muted)]">
                    {formatValue(exp.mean, config.unit, config.decimals)}
                  </td>
                  <td className="py-2 text-right text-green-500/80 text-xs">
                    {formatValue(exp.min, config.unit, config.decimals)}
                  </td>
                  <td className="py-2 text-right text-red-500/80 text-xs">
                    {formatValue(exp.max, config.unit, config.decimals)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-[var(--text-muted)] mt-3">
        Fonte: Banco Central do Brasil – Pesquisa Focus
      </p>
    </div>
  );
}
