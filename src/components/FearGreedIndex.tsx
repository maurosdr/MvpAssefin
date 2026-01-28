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
    fetch('/api/feargreed')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const value = data?.value ?? 50;
  const color = getColor(value);
  const label = data?.classification || getLabel(value);

  const angle = (value / 100) * 180 - 90;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-white mb-4">Fear & Greed Index</h2>
      <div className="flex flex-col items-center">
        <div className="relative w-48 h-24 mb-4">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 10 100 A 90 90 0 0 1 190 100"
              fill="none"
              stroke="#1f2937"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {/* Gradient arc segments */}
            <path d="M 10 100 A 90 90 0 0 1 46 28" fill="none" stroke="#ef4444" strokeWidth="16" strokeLinecap="round" />
            <path d="M 46 28 A 90 90 0 0 1 100 10" fill="none" stroke="#f97316" strokeWidth="16" />
            <path d="M 100 10 A 90 90 0 0 1 154 28" fill="none" stroke="#eab308" strokeWidth="16" />
            <path d="M 154 28 A 90 90 0 0 1 190 100" fill="none" stroke="#22c55e" strokeWidth="16" strokeLinecap="round" />
            {/* Needle */}
            <line
              x1="100"
              y1="100"
              x2={100 + 70 * Math.cos((angle * Math.PI) / 180)}
              y2={100 - 70 * Math.sin((angle * Math.PI) / 180)}
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="6" fill={color} />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-4xl font-bold" style={{ color }}>
            {value}
          </p>
          <p className="text-lg font-medium mt-1" style={{ color }}>
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
