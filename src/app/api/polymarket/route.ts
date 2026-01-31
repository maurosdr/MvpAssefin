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

interface ParsedMarket {
  id: string;
  title: string;
  slug: string;
  volume: number;
  liquidity: number;
  endDate: string;
  category: 'politics' | 'crypto' | 'economy';
  outcomes: { name: string; price: number }[];
}

const POLITICS_KEYWORDS = [
  'trump', 'biden', 'president', 'election', 'congress', 'senate', 'house',
  'democrat', 'republican', 'vote', 'governor', 'political', 'impeach',
  'supreme court', 'government', 'cabinet', 'minister', 'parliament',
  'legislation', 'poll', 'primary', 'nominee', 'campaign', 'ballot'
];

const CRYPTO_KEYWORDS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain', 'token',
  'defi', 'nft', 'solana', 'sol', 'dogecoin', 'doge', 'ripple', 'xrp',
  'binance', 'coinbase', 'altcoin', 'stablecoin', 'usdt', 'usdc', 'web3',
  'halving', 'mining', 'wallet', 'exchange'
];

const ECONOMY_KEYWORDS = [
  'fed', 'federal reserve', 'rate', 'inflation', 'gdp', 'recession',
  'unemployment', 'stock', 'market', 's&p', 'nasdaq', 'dow', 'treasury',
  'bond', 'yield', 'cpi', 'economy', 'economic', 'tariff', 'trade',
  'debt', 'deficit', 'stimulus', 'monetary', 'fiscal', 'bank'
];

function categorizeMarket(title: string): 'politics' | 'crypto' | 'economy' {
  const lowerTitle = title.toLowerCase();

  const cryptoScore = CRYPTO_KEYWORDS.filter(k => lowerTitle.includes(k)).length;
  const politicsScore = POLITICS_KEYWORDS.filter(k => lowerTitle.includes(k)).length;
  const economyScore = ECONOMY_KEYWORDS.filter(k => lowerTitle.includes(k)).length;

  if (cryptoScore >= politicsScore && cryptoScore >= economyScore && cryptoScore > 0) {
    return 'crypto';
  }
  if (economyScore >= politicsScore && economyScore > 0) {
    return 'economy';
  }
  return 'politics';
}

function parseOutcomes(market: PolymarketMarket): { name: string; price: number }[] {
  try {
    const prices = JSON.parse(market.outcomePrices || '[]');
    const names = JSON.parse(market.outcomes || '["Yes", "No"]');

    return names.map((name: string, i: number) => ({
      name,
      price: parseFloat(prices[i] || '0')
    })).sort((a: { price: number }, b: { price: number }) => b.price - a.price);
  } catch {
    return [
      { name: 'Yes', price: 0.5 },
      { name: 'No', price: 0.5 }
    ];
  }
}

export async function GET() {
  try {
    const res = await fetch(
      'https://gamma-api.polymarket.com/events?limit=100&active=true&closed=false&order=volume&ascending=false',
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

    const allMarkets: ParsedMarket[] = data
      .filter((e) => e.active && !e.closed && e.markets?.length > 0)
      .map((event) => {
        const mainMarket = event.markets[0];
        const outcomes = parseOutcomes(mainMarket);
        const category = categorizeMarket(event.title);

        return {
          id: event.id,
          title: event.title,
          slug: event.slug,
          volume: event.volume || mainMarket.volume || 0,
          liquidity: event.liquidity || mainMarket.liquidity || 0,
          endDate: event.endDate,
          category,
          outcomes,
        };
      });

    const politicsMarkets = allMarkets.filter(m => m.category === 'politics').slice(0, 10);
    const cryptoMarkets = allMarkets.filter(m => m.category === 'crypto').slice(0, 10);
    const economyMarkets = allMarkets.filter(m => m.category === 'economy').slice(0, 10);

    return NextResponse.json({
      politics: politicsMarkets,
      crypto: cryptoMarkets,
      economy: economyMarkets,
      source: 'live',
    });
  } catch {
    return NextResponse.json({
      markets: getFallbackData(),
      source: 'cache',
    });
  }
}

function getFallbackData() {
  return {
    politics: [
      { id: 'p1', title: 'Presidential Election 2028 Winner', slug: '', volume: 5200000, liquidity: 1200000, endDate: '2028-11-05', category: 'politics', outcomes: [{ name: 'Republican', price: 0.52 }, { name: 'Democrat', price: 0.48 }] },
      { id: 'p2', title: 'Trump wins 2028 GOP Primary?', slug: '', volume: 2100000, liquidity: 580000, endDate: '2028-06-01', category: 'politics', outcomes: [{ name: 'Yes', price: 0.65 }, { name: 'No', price: 0.35 }] },
      { id: 'p3', title: 'Republicans win Senate 2026?', slug: '', volume: 1800000, liquidity: 450000, endDate: '2026-11-03', category: 'politics', outcomes: [{ name: 'Yes', price: 0.58 }, { name: 'No', price: 0.42 }] },
      { id: 'p4', title: 'Democrats win House 2026?', slug: '', volume: 1500000, liquidity: 380000, endDate: '2026-11-03', category: 'politics', outcomes: [{ name: 'Yes', price: 0.45 }, { name: 'No', price: 0.55 }] },
      { id: 'p5', title: 'New Supreme Court Justice in 2026?', slug: '', volume: 900000, liquidity: 220000, endDate: '2026-12-31', category: 'politics', outcomes: [{ name: 'Yes', price: 0.25 }, { name: 'No', price: 0.75 }] },
    ],
    crypto: [
      { id: 'c1', title: 'Bitcoin above $150k by end of 2026?', slug: '', volume: 3100000, liquidity: 890000, endDate: '2026-12-31', category: 'crypto', outcomes: [{ name: 'Yes', price: 0.35 }, { name: 'No', price: 0.65 }] },
      { id: 'c2', title: 'ETH Spot ETF approved in 2026?', slug: '', volume: 1900000, liquidity: 540000, endDate: '2026-12-31', category: 'crypto', outcomes: [{ name: 'Yes', price: 0.72 }, { name: 'No', price: 0.28 }] },
      { id: 'c3', title: 'Solana flips Ethereum market cap?', slug: '', volume: 1200000, liquidity: 340000, endDate: '2026-12-31', category: 'crypto', outcomes: [{ name: 'Yes', price: 0.15 }, { name: 'No', price: 0.85 }] },
      { id: 'c4', title: 'Bitcoin ETF AUM exceeds $100B?', slug: '', volume: 980000, liquidity: 280000, endDate: '2026-06-30', category: 'crypto', outcomes: [{ name: 'Yes', price: 0.62 }, { name: 'No', price: 0.38 }] },
      { id: 'c5', title: 'Dogecoin reaches $1?', slug: '', volume: 750000, liquidity: 190000, endDate: '2026-12-31', category: 'crypto', outcomes: [{ name: 'Yes', price: 0.08 }, { name: 'No', price: 0.92 }] },
    ],
    economy: [
      { id: 'e1', title: 'Fed rate cut in Q1 2026?', slug: '', volume: 2800000, liquidity: 720000, endDate: '2026-03-31', category: 'economy', outcomes: [{ name: 'Yes', price: 0.61 }, { name: 'No', price: 0.39 }] },
      { id: 'e2', title: 'US Recession in 2026?', slug: '', volume: 1500000, liquidity: 430000, endDate: '2026-12-31', category: 'economy', outcomes: [{ name: 'Yes', price: 0.22 }, { name: 'No', price: 0.78 }] },
      { id: 'e3', title: 'S&P 500 above 6000 by mid-2026?', slug: '', volume: 1300000, liquidity: 350000, endDate: '2026-06-30', category: 'economy', outcomes: [{ name: 'Yes', price: 0.55 }, { name: 'No', price: 0.45 }] },
      { id: 'e4', title: 'US Inflation below 2.5% in 2026?', slug: '', volume: 1100000, liquidity: 290000, endDate: '2026-12-31', category: 'economy', outcomes: [{ name: 'Yes', price: 0.48 }, { name: 'No', price: 0.52 }] },
      { id: 'e5', title: 'US-China trade deal in 2026?', slug: '', volume: 850000, liquidity: 210000, endDate: '2026-12-31', category: 'economy', outcomes: [{ name: 'Yes', price: 0.32 }, { name: 'No', price: 0.68 }] },
    ],
  };
}
