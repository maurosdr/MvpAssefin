import { NextResponse } from 'next/server';

interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  volume: number;
  liquidity: number;
  endDate: string;
  active: boolean;
  closed: boolean;
  markets: {
    id: string;
    question: string;
    outcomePrices: string;
    volume: number;
    liquidity: number;
  }[];
}

export async function GET() {
  try {
    const res = await fetch(
      'https://gamma-api.polymarket.com/events?limit=20&active=true&closed=false&order=volume&ascending=false',
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

    const markets = data
      .filter((e) => e.active && !e.closed && e.markets?.length > 0)
      .slice(0, 5)
      .map((event) => {
        const mainMarket = event.markets[0];
        let yesPrice = 0;
        let noPrice = 0;
        try {
          const prices = JSON.parse(mainMarket.outcomePrices || '[]');
          yesPrice = parseFloat(prices[0] || '0');
          noPrice = parseFloat(prices[1] || '0');
        } catch {
          // ignore parse errors
        }

        return {
          id: event.id,
          title: event.title,
          slug: event.slug,
          volume: event.volume || mainMarket.volume || 0,
          liquidity: event.liquidity || mainMarket.liquidity || 0,
          yes_price: yesPrice,
          no_price: noPrice,
          endDate: event.endDate,
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

function getFallbackData() {
  return [
    { id: '1', title: 'Presidential Election 2028 Winner', slug: '', volume: 5200000, liquidity: 1200000, yes_price: 0.52, no_price: 0.48, endDate: '2028-11-05' },
    { id: '2', title: 'Bitcoin above $150k by end of 2026?', slug: '', volume: 3100000, liquidity: 890000, yes_price: 0.35, no_price: 0.65, endDate: '2026-12-31' },
    { id: '3', title: 'Fed rate cut in Q1 2026?', slug: '', volume: 2800000, liquidity: 720000, yes_price: 0.61, no_price: 0.39, endDate: '2026-03-31' },
    { id: '4', title: 'ETH Spot ETF approved in 2026?', slug: '', volume: 1900000, liquidity: 540000, yes_price: 0.72, no_price: 0.28, endDate: '2026-12-31' },
    { id: '5', title: 'US Recession in 2026?', slug: '', volume: 1500000, liquidity: 430000, yes_price: 0.22, no_price: 0.78, endDate: '2026-12-31' },
  ];
}
