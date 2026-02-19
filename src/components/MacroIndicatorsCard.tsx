'use client';

import { useState, useEffect } from 'react';

interface MacroMetric {
  value: number;
  date: string;
  label: string;
}

interface MacroCountryData {
  inflation: MacroMetric;
  unemployment: MacroMetric;
  interestRate: MacroMetric;
  gdp: MacroMetric;
}

interface MacroIndicatorsResponse {
  us: MacroCountryData;
  br: MacroCountryData;
  lastUpdated: string;
}

function MetricRow({ label, value, suffix = '%' }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-hover)] px-2 -mx-2 rounded transition-colors">
      <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{label}</span>
      <span className="data-value text-sm font-bold text-[var(--text-primary)]">
        {value.toFixed(2)}{suffix}
      </span>
    </div>
  );
}

export default function MacroIndicatorsCard() {
  const [data, setData] = useState<MacroIndicatorsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/market/macro-indicators', { cache: 'no-store' });
        const data = await res.json();
        setData(data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    
    // Delay para não competir com outras chamadas
    setTimeout(fetchData, 600);
  }, []);

  return (
    <div className="modern-card h-full">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[var(--border)]">
        <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
        <h2 className="section-title text-[var(--accent)]">
          MACRO INDICATORS
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-4">
          {/* US Column */}
          <div className="bg-[var(--info-soft)]/30 border border-[var(--info)]/20 rounded-lg p-3">
            <h3 className="text-xs font-bold text-[var(--info)] mb-3 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--info)] inline-block" />
              United States
            </h3>
            <MetricRow label={data.us.inflation.label} value={data.us.inflation.value} />
            <MetricRow label={data.us.unemployment.label} value={data.us.unemployment.value} />
            <MetricRow label={data.us.interestRate.label} value={data.us.interestRate.value} />
            {data.us.gdp && <MetricRow label={data.us.gdp.label} value={data.us.gdp.value} />}
          </div>

          {/* BR Column */}
          <div className="bg-[var(--success-soft)]/30 border border-[var(--success)]/20 rounded-lg p-3">
            <h3 className="text-xs font-bold text-[var(--success)] mb-3 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--success)] inline-block" />
              Brazil
            </h3>
            <MetricRow label={data.br.inflation.label} value={data.br.inflation.value} />
            <MetricRow label={data.br.unemployment.label} value={data.br.unemployment.value} />
            <MetricRow label={data.br.interestRate.label} value={data.br.interestRate.value} />
            {data.br.gdp && <MetricRow label={data.br.gdp.label} value={data.br.gdp.value} />}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">Failed to load data</p>
      )}
    </div>
  );
}
