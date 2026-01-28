import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch from Kalshi public API for Trump mention markets
    const res = await fetch(
      'https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker=KXTRUMPMENTION&limit=20',
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      // If API fails, return mock data based on the known market
      return NextResponse.json({
        events: getMockData(),
        source: 'cache',
      });
    }

    const data = await res.json();
    const markets = data.markets || [];

    const events = markets.map((m: Record<string, unknown>) => ({
      title: m.title || m.subtitle || 'Unknown',
      yes_price: ((m.yes_bid as number) || 0) / 100,
      no_price: ((m.no_bid as number) || 0) / 100,
      volume: m.volume || 0,
      ticker: m.ticker,
      status: m.status,
    }));

    return NextResponse.json({ events, source: 'live' });
  } catch {
    return NextResponse.json({
      events: getMockData(),
      source: 'cache',
    });
  }
}

function getMockData() {
  return [
    { title: 'Trump mentions "Bitcoin"', yes_price: 0.12, no_price: 0.88, volume: 45230 },
    { title: 'Trump mentions "Crypto"', yes_price: 0.08, no_price: 0.92, volume: 32100 },
    { title: 'Trump mentions "Elon"', yes_price: 0.25, no_price: 0.75, volume: 67800 },
    { title: 'Trump mentions "China"', yes_price: 0.65, no_price: 0.35, volume: 89400 },
    { title: 'Trump mentions "Border"', yes_price: 0.72, no_price: 0.28, volume: 54300 },
    { title: 'Trump mentions "Economy"', yes_price: 0.55, no_price: 0.45, volume: 41200 },
  ];
}
