'use client';

import { useEffect, useState } from 'react';
import { FearGreedData } from '@/types/crypto';

function getColor(value: number): string {
  if (value <= 25) return '#ef4444';
  if (value <= 45) return '#f97316';
  if (value <= 55) return '#eab308';
  if (value <= 75) return '#84cc16';
  return '#22c55e';
}

function getLabel(value: number): string {
  if (value <= 25) return 'Extreme Fear';
  if (value <= 45) return 'Fear';
  if (value <= 55) return 'Neutral';
  if (value <= 75) return 'Greed';
  return 'Extreme Greed';
}

export default function FearGreedIndex() {
  const [data, setData] = useState<FearGreedData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/feargreed', { cache: 'no-store' });
        const data = await res.json();
        setData(data);
      } catch {
        // Error handling
      }
    };
    
    // Delay para não competir com outras chamadas
    setTimeout(fetchData, 200);
  }, []);

  const value = data?.value ?? 50;
  const color = getColor(value);
  const label = data?.classification || getLabel(value);

  const angle = (value / 100) * 180 - 90;

  return (
    <div className="modern-card">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[var(--border)]">
        <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
        <h2 className="section-title text-[var(--accent)]">Fear & Greed Index</h2>
      </div>
      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-[280px] h-32 mb-6">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 10 100 A 90 90 0 0 1 190 100"
              fill="none"
              stroke="var(--border)"
              strokeWidth="18"
              strokeLinecap="round"
            />
            {/* Gradient arc segments */}
            <path d="M 10 100 A 90 90 0 0 1 46 28" fill="none" stroke="#ef4444" strokeWidth="18" strokeLinecap="round" />
            <path d="M 46 28 A 90 90 0 0 1 100 10" fill="none" stroke="#f97316" strokeWidth="18" />
            <path d="M 100 10 A 90 90 0 0 1 154 28" fill="none" stroke="#eab308" strokeWidth="18" />
            <path d="M 154 28 A 90 90 0 0 1 190 100" fill="none" stroke="#22c55e" strokeWidth="18" strokeLinecap="round" />
            {/* Needle */}
            <line
              x1="100"
              y1="100"
              x2={100 + 70 * Math.cos((angle * Math.PI) / 180)}
              y2={100 - 70 * Math.sin((angle * Math.PI) / 180)}
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="8" fill={color} />
            <circle cx="100" cy="100" r="4" fill="var(--bg)" />
          </svg>
        </div>
        <div className="text-center w-full">
          <p className="text-5xl font-bold mb-2" style={{ color }}>
            {value}
          </p>
          <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color }}>
            {label}
          </p>
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
              <span>PRESSÃO DE COMPRA</span>
              <span className="data-value text-[var(--info)]">{value}%</span>
            </div>
            <div className="w-full h-2 bg-[var(--surface)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--info)] to-[var(--success)] transition-all duration-500"
                style={{ width: `${value}%` }}
              />
            </div>
            <div className="mt-3 text-xs text-[var(--text-muted)]">
              VOLATILIDADE (30D): <span className="data-value text-[var(--success)]">BAIXA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
