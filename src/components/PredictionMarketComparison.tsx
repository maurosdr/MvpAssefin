'use client';

import { useEffect, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface KalshiEvent {
  title: string;
  yes_price: number;
  no_price: number;
  volume: number;
}

interface PolymarketOutcome {
  name: string;
  price: number;
}

interface PolymarketMarket {
  id: string;
  title: string;
  slug: string;
  volume: number;
  liquidity: number;
  yes_price?: number;
  no_price?: number;
  endDate: string;
  category?: string;
  outcomes?: PolymarketOutcome[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatVolume(v: number): string {
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
  return '$' + v.toFixed(0);
}

function normalizePolymarketPrices(
  market: PolymarketMarket
): { yes: number; no: number } {
  // If the market already has yes_price/no_price (flat shape)
  if (typeof market.yes_price === 'number' && market.yes_price > 0) {
    return { yes: market.yes_price, no: market.no_price ?? 1 - market.yes_price };
  }
  // If the market has outcomes array (categorized shape)
  if (market.outcomes && market.outcomes.length >= 2) {
    const yesOutcome = market.outcomes.find((o) => o.name === 'Yes');
    const noOutcome = market.outcomes.find((o) => o.name === 'No');
    if (yesOutcome && noOutcome) {
      return { yes: yesOutcome.price, no: noOutcome.price };
    }
    // Fallback: first outcome is "Yes-like", second is "No-like"
    return { yes: market.outcomes[0].price, no: market.outcomes[1].price };
  }
  return { yes: 0.5, no: 0.5 };
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function PriceBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 w-6 shrink-0 uppercase">{label}</span>
      <div className="flex-1 h-2 bg-gray-700/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`font-mono text-xs font-semibold w-10 text-right ${
        label === 'Yes' ? 'text-green-400' : 'text-red-400'
      }`}>
        {pct}%
      </span>
    </div>
  );
}

function KalshiSection({
  events,
  loading,
  source,
}: {
  events: KalshiEvent[];
  loading: boolean;
  source: string;
}) {
  const totalVolume = events.reduce((sum, e) => sum + (e.volume || 0), 0);

  return (
    <div className="flex-1 min-w-0">
      {/* Platform header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Kalshi</h3>
          <p className="text-[10px] text-gray-500">Regulated US exchange</p>
        </div>
        {source === 'cache' && (
          <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded ml-auto">
            Cached
          </span>
        )}
      </div>

      {/* Stats pill */}
      <div className="flex items-center gap-3 mb-4 px-3 py-2 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
        <div className="text-xs text-gray-400">
          Total Vol: <span className="text-yellow-400 font-mono font-semibold">{formatVolume(totalVolume)}</span>
        </div>
        <div className="text-xs text-gray-400">
          Markets: <span className="text-yellow-400 font-mono font-semibold">{events.length}</span>
        </div>
      </div>

      {/* Events list */}
      {loading ? (
        <div className="py-10 flex justify-center">
          <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No events available</p>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => (
            <div
              key={i}
              className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-3 hover:bg-gray-800/60 hover:border-yellow-500/20 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <p className="text-sm text-[var(--text)] font-medium leading-snug line-clamp-2">
                  {event.title}
                </p>
                <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap shrink-0">
                  {formatVolume(event.volume)}
                </span>
              </div>
              <div className="space-y-1.5">
                <PriceBar label="Yes" value={event.yes_price} color="bg-green-500" />
                <PriceBar label="No" value={event.no_price} color="bg-red-500/70" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PolymarketSection({
  markets,
  loading,
  source,
}: {
  markets: PolymarketMarket[];
  loading: boolean;
  source: string;
}) {
  const totalVolume = markets.reduce((sum, m) => sum + (m.volume || 0), 0);

  return (
    <div className="flex-1 min-w-0">
      {/* Platform header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider">Polymarket</h3>
          <p className="text-[10px] text-gray-500">Decentralized prediction market</p>
        </div>
        {source === 'cache' && (
          <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded ml-auto">
            Cached
          </span>
        )}
      </div>

      {/* Stats pill */}
      <div className="flex items-center gap-3 mb-4 px-3 py-2 rounded-xl bg-purple-500/5 border border-purple-500/10">
        <div className="text-xs text-gray-400">
          Total Vol: <span className="text-purple-400 font-mono font-semibold">{formatVolume(totalVolume)}</span>
        </div>
        <div className="text-xs text-gray-400">
          Markets: <span className="text-purple-400 font-mono font-semibold">{markets.length}</span>
        </div>
      </div>

      {/* Markets list */}
      {loading ? (
        <div className="py-10 flex justify-center">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : markets.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No markets available</p>
      ) : (
        <div className="space-y-3">
          {markets.map((market, i) => {
            const { yes, no } = normalizePolymarketPrices(market);
            return (
              <div
                key={market.id || i}
                className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-3 hover:bg-gray-800/60 hover:border-purple-500/20 transition-all cursor-pointer"
                onClick={() =>
                  window.open(
                    market.slug
                      ? `https://polymarket.com/event/${market.slug}`
                      : 'https://polymarket.com',
                    '_blank'
                  )
                }
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <p className="text-sm text-[var(--text)] font-medium leading-snug line-clamp-2">
                    {market.title}
                  </p>
                  <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap shrink-0">
                    {formatVolume(market.volume)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <PriceBar label="Yes" value={yes} color="bg-green-500" />
                  <PriceBar label="No" value={no} color="bg-red-500/70" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function PredictionMarketComparison() {
  const [kalshiEvents, setKalshiEvents] = useState<KalshiEvent[]>([]);
  const [kalshiSource, setKalshiSource] = useState('');
  const [kalshiLoading, setKalshiLoading] = useState(true);

  const [polymarketMarkets, setPolymarketMarkets] = useState<PolymarketMarket[]>([]);
  const [polymarketSource, setPolymarketSource] = useState('');
  const [polymarketLoading, setPolymarketLoading] = useState(true);

  useEffect(() => {
    // Fetch Kalshi data
    fetch('/api/kalshi')
      .then((r) => r.json())
      .then((data) => {
        setKalshiEvents(data.events || []);
        setKalshiSource(data.source || '');
      })
      .catch(() => {})
      .finally(() => setKalshiLoading(false));

    // Fetch Polymarket data
    fetch('/api/polymarket')
      .then((r) => r.json())
      .then((data) => {
        // Handle both response shapes:
        // Shape A (flat): { markets: [...], source }
        // Shape B (categorized): { politics: [...], crypto: [...], economy: [...], source }
        if (data.markets && Array.isArray(data.markets)) {
          setPolymarketMarkets(data.markets);
        } else if (data.politics || data.crypto || data.economy) {
          const combined: PolymarketMarket[] = [
            ...(data.politics || []),
            ...(data.crypto || []),
            ...(data.economy || []),
          ]
            .sort((a: PolymarketMarket, b: PolymarketMarket) => (b.volume || 0) - (a.volume || 0))
            .slice(0, 10);
          setPolymarketMarkets(combined);
        }
        setPolymarketSource(data.source || '');
      })
      .catch(() => {})
      .finally(() => setPolymarketLoading(false));
  }, []);

  const kalshiTotalVol = kalshiEvents.reduce((s, e) => s + (e.volume || 0), 0);
  const polyTotalVol = polymarketMarkets.reduce((s, m) => s + (m.volume || 0), 0);

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">
                Prediction Markets - Kalshi vs Polymarket
              </h2>
              <p className="text-[var(--text-muted)] text-sm mt-0.5">
                Side-by-side comparison of top prediction markets
              </p>
            </div>
          </div>
          <span className="text-xs bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-1 rounded font-medium">
            LIVE
          </span>
        </div>
      </div>

      {/* Summary stats row */}
      <div className="px-6 py-3 border-b border-[var(--border)]/50 bg-gray-800/20">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-xs text-gray-400">Kalshi Volume:</span>
              <span className="text-xs text-yellow-400 font-mono font-semibold">
                {kalshiLoading ? '...' : formatVolume(kalshiTotalVol)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-xs text-gray-400">Polymarket Volume:</span>
              <span className="text-xs text-purple-400 font-mono font-semibold">
                {polymarketLoading ? '...' : formatVolume(polyTotalVol)}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-gray-500">
            {kalshiEvents.length + polymarketMarkets.length} total markets tracked
          </div>
        </div>
      </div>

      {/* Two-column comparison */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <KalshiSection
            events={kalshiEvents}
            loading={kalshiLoading}
            source={kalshiSource}
          />

          {/* Divider */}
          <div className="hidden md:block w-px bg-[var(--border)]/50 self-stretch" />
          <div className="md:hidden h-px bg-[var(--border)]/50" />

          <PolymarketSection
            markets={polymarketMarkets}
            loading={polymarketLoading}
            source={polymarketSource}
          />
        </div>
      </div>
    </div>
  );
}
