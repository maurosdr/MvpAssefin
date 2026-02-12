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
}

interface MacroIndicatorsResponse {
  us: MacroCountryData;
  br: MacroCountryData;
  lastUpdated: string;
}

function MetricRow({ label, value, suffix = '%' }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-b-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-bold text-white font-mono">
        {value.toFixed(2)}{suffix}
      </span>
    </div>
  );
}

export default function MacroIndicatorsCard() {
  const [data, setData] = useState<MacroIndicatorsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/market/macro-indicators')
      .then((r) => r.json())
      .then((result) => setData(result))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 h-full">
      <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Macro Indicators
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-4">
          {/* US Column */}
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              US
            </h3>
            <MetricRow label={data.us.inflation.label} value={data.us.inflation.value} />
            <MetricRow label={data.us.unemployment.label} value={data.us.unemployment.value} />
            <MetricRow label={data.us.interestRate.label} value={data.us.interestRate.value} />
          </div>

          {/* BR Column */}
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Brazil
            </h3>
            <MetricRow label={data.br.inflation.label} value={data.br.inflation.value} />
            <MetricRow label={data.br.unemployment.label} value={data.br.unemployment.value} />
            <MetricRow label={data.br.interestRate.label} value={data.br.interestRate.value} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">Failed to load data</p>
      )}
    </div>
  );
}
