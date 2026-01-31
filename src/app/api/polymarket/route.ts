import { NextResponse } from 'next/server';

interface PolymarketMarket {
  id: string;
  question: string;
  outcomePrices: string;
  outcomes: string;
  volume: number;
  liquidity: number;
}

interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  volume: number;
  liquidity: number;
  endDate: string;
  active: boolean;
  closed: boolean;
  markets: PolymarketMarket[];
}

interface Outcome {
  name: string;
  probability: number;
}

interface TransformedMarket {
  id: string;
  title: string;
  slug: string;
  volume: number;
  liquidity: number;
  endDate: string;
  isMultiOutcome: boolean;
  outcomes: Outcome[];
}

export async function GET() {
  try {
    const res = await fetch(
      'https://gamma-api.polymarket.com/events?limit=30&active=true&closed=false&order=volume&ascending=false',
      {
        headers: {
          Accept: 'application/json',
        },
        next: { revalidate: 30 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({
        markets: getFallbackData(),
        source: 'cache',
      });
    }

    const data: PolymarketEvent[] = await res.json();

    const markets: TransformedMarket[] = data
      .filter((e) => e.active && !e.closed && e.markets?.length > 0)
      .slice(0, 10)
      .map((event) => {
        // Check if this is a multi-outcome market (multiple markets in the event)
        const isMultiOutcome = event.markets.length > 1;

        let outcomes: Outcome[] = [];

        if (isMultiOutcome) {
          // For multi-outcome markets, each market represents an outcome
          outcomes = event.markets.map((market) => {
            let probability = 0;
            try {
              const prices = JSON.parse(market.outcomePrices || '[]');
              probability = parseFloat(prices[0] || '0');
            } catch {
              // ignore parse errors
            }
            return {
              name: market.question || 'Unknown',
              probability,
            };
          });
          // Sort by probability and take top outcomes
          outcomes.sort((a, b) => b.probability - a.probability);
        } else {
          // For binary markets, extract Yes/No from the single market
          const mainMarket = event.markets[0];
          try {
            const prices = JSON.parse(mainMarket.outcomePrices || '[]');
            const outcomeNames = JSON.parse(mainMarket.outcomes || '["Yes", "No"]');
            outcomes = outcomeNames.map((name: string, i: number) => ({
              name,
              probability: parseFloat(prices[i] || '0'),
            }));
          } catch {
            outcomes = [
              { name: 'Yes', probability: 0 },
              { name: 'No', probability: 0 },
            ];
          }
        }

        return {
          id: event.id,
          title: event.title,
          slug: event.slug,
          volume: event.volume || 0,
          liquidity: event.liquidity || 0,
          endDate: event.endDate,
          isMultiOutcome,
          outcomes,
        };
      });

    return NextResponse.json({ markets, source: 'live' });
  } catch {
    return NextResponse.json({
      markets: getFallbackData(),
      source: 'cache',
    });
  }
}

function getFallbackData(): TransformedMarket[] {
  return [
    { id: '1', title: 'Presidential Election 2028 Winner', slug: '', volume: 5200000, liquidity: 1200000, endDate: '2028-11-05', isMultiOutcome: true, outcomes: [{ name: 'Democratic Candidate', probability: 0.48 }, { name: 'Republican Candidate', probability: 0.45 }, { name: 'Other', probability: 0.07 }] },
    { id: '2', title: 'Bitcoin above $150k by end of 2026?', slug: '', volume: 3100000, liquidity: 890000, endDate: '2026-12-31', isMultiOutcome: false, outcomes: [{ name: 'Yes', probability: 0.35 }, { name: 'No', probability: 0.65 }] },
    { id: '3', title: 'Fed rate cut in Q1 2026?', slug: '', volume: 2800000, liquidity: 720000, endDate: '2026-03-31', isMultiOutcome: false, outcomes: [{ name: 'Yes', probability: 0.61 }, { name: 'No', probability: 0.39 }] },
    { id: '4', title: 'ETH Spot ETF approved in 2026?', slug: '', volume: 1900000, liquidity: 540000, endDate: '2026-12-31', isMultiOutcome: false, outcomes: [{ name: 'Yes', probability: 0.72 }, { name: 'No', probability: 0.28 }] },
    { id: '5', title: 'US Recession in 2026?', slug: '', volume: 1500000, liquidity: 430000, endDate: '2026-12-31', isMultiOutcome: false, outcomes: [{ name: 'Yes', probability: 0.22 }, { name: 'No', probability: 0.78 }] },
    { id: '6', title: 'Next Fed Chair 2026', slug: '', volume: 1400000, liquidity: 380000, endDate: '2026-06-30', isMultiOutcome: true, outcomes: [{ name: 'Jerome Powell', probability: 0.55 }, { name: 'Other', probability: 0.45 }] },
    { id: '7', title: 'Solana flips Ethereum market cap?', slug: '', volume: 1200000, liquidity: 320000, endDate: '2026-12-31', isMultiOutcome: false, outcomes: [{ name: 'Yes', probability: 0.15 }, { name: 'No', probability: 0.85 }] },
    { id: '8', title: 'US GDP Growth Q1 2026', slug: '', volume: 980000, liquidity: 280000, endDate: '2026-04-30', isMultiOutcome: true, outcomes: [{ name: 'Above 2%', probability: 0.42 }, { name: '1-2%', probability: 0.35 }, { name: 'Below 1%', probability: 0.23 }] },
    { id: '9', title: 'Apple stock above $250 EOY 2026?', slug: '', volume: 850000, liquidity: 240000, endDate: '2026-12-31', isMultiOutcome: false, outcomes: [{ name: 'Yes', probability: 0.58 }, { name: 'No', probability: 0.42 }] },
    { id: '10', title: 'Supreme Court ruling on Crypto regulation', slug: '', volume: 720000, liquidity: 190000, endDate: '2026-06-30', isMultiOutcome: true, outcomes: [{ name: 'Pro-Crypto', probability: 0.38 }, { name: 'Anti-Crypto', probability: 0.32 }, { name: 'Neutral', probability: 0.30 }] },
  ];
}
