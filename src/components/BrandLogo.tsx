'use client';

import React from 'react';

type BrandLogoVariant = 'horizontal' | 'icon';

export default function BrandLogo({
  variant = 'horizontal',
  size = 28,
  className,
  monochrome = false,
  label = 'Assefin',
}: {
  variant?: BrandLogoVariant;
  size?: number;
  className?: string;
  monochrome?: boolean;
  /** Acessibilidade (lido por leitores de tela) */
  label?: string;
}) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={label}
      className="brand-mark block"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="assefinAccent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={monochrome ? 'currentColor' : 'var(--accent)'} stopOpacity="1" />
          <stop offset="100%" stopColor={monochrome ? 'currentColor' : 'var(--accent-strong)'} stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Base geometry: a premium "A" monogram with a market/arrow cut */}
      <rect x="3.5" y="3.5" width="25" height="25" rx="8" fill="none" stroke="currentColor" strokeOpacity="0.35" />

      {/* Left pillar */}
      <path
        d="M9 24.5V9.5c0-.9.7-1.6 1.6-1.6h1.1c.9 0 1.6.7 1.6 1.6v15c0 .9-.7 1.6-1.6 1.6h-1.1c-.9 0-1.6-.7-1.6-1.6Z"
        fill="currentColor"
        fillOpacity="0.92"
      />

      {/* Right pillar */}
      <path
        d="M18.7 24.5V9.5c0-.9.7-1.6 1.6-1.6h1.1c.9 0 1.6.7 1.6 1.6v15c0 .9-.7 1.6-1.6 1.6h-1.1c-.9 0-1.6-.7-1.6-1.6Z"
        fill="currentColor"
        fillOpacity="0.92"
      />

      {/* Diagonal "market up" stroke (accent) */}
      <path
        className="brand-accent"
        d="M10.6 19.4l4.2-4.2 2.2 2.2 4.4-4.4"
        fill="none"
        stroke="url(#assefinAccent)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Small dot — signature (non-generic) */}
      <circle
        className="brand-dot"
        cx="22.6"
        cy="13"
        r="1.7"
        fill={monochrome ? 'currentColor' : 'var(--accent)'}
      />
    </svg>
  );

  if (variant === 'icon') {
    return <span className={className}>{mark}</span>;
  }

  return (
    <span className={['brand-logo inline-flex items-center gap-2 select-none', className].filter(Boolean).join(' ')}>
      {mark}
      <span className="brand-wordmark leading-none">
        <span className="block text-[15px] sm:text-[16px] font-black tracking-tight text-[var(--text-primary)]">
          ASSEFIN
        </span>
        <span className="block text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Mercados
        </span>
      </span>
    </span>
  );
}

