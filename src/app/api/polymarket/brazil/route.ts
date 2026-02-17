import { NextResponse } from 'next/server';

const EVENT_SLUGS = [
  'brazil-presidential-election',
  'next-brazil-senate-election-most-seats-won',
];

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

export async function GET() {
  try {
    const fetches = EVENT_SLUGS.map((slug) =>
      fetch(
        `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`,
        {
          headers: { Accept: 'application/json' },
          next: { revalidate: 60 },
        }
      )
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
    );

    const results = await Promise.all(fetches);

    const allEvents: PolymarketEvent[] = [];
    for (const result of results) {
      // API may return a single object or an array
      const eventList = Array.isArray(result) ? result : [result];
      for (const event of eventList) {
        if (event && event.markets?.length > 0) {
          allEvents.push(event);
        }
      }
    }

    const markets = allEvents
      .map((event) => {
        let candidates: { name: string; odds: number }[] = [];

        if (event.markets.length > 1) {
          candidates = event.markets.map((m) => {
            try {
              const prices = JSON.parse(m.outcomePrices || '[]');
              const names = JSON.parse(m.outcomes || '["Yes", "No"]');
              const yesIdx = names.indexOf('Yes');
              const yesPrice = yesIdx >= 0 ? parseFloat(prices[yesIdx] || '0') : parseFloat(prices[0] || '0');
              return {
                name: m.question.replace(/Will | win.*| be.*| become.*/gi, '').trim() || names[0],
                odds: yesPrice,
              };
            } catch {
              return { name: m.question, odds: 0.5 };
            }
          });
        } else {
          const mainMarket = event.markets[0];
          try {
            const prices = JSON.parse(mainMarket.outcomePrices || '[]');
            const names = JSON.parse(mainMarket.outcomes || '["Yes", "No"]');
            candidates = names.map((name: string, i: number) => ({
              name,
              odds: parseFloat(prices[i] || '0'),
            }));
          } catch {
            candidates = [
              { name: 'Yes', odds: 0.5 },
              { name: 'No', odds: 0.5 },
            ];
          }
        }

        candidates.sort((a, b) => b.odds - a.odds);

        return {
          id: event.id,
          title: event.title,
          slug: event.slug,
          volume: event.volume || event.markets[0]?.volume || 0,
          endDate: event.endDate,
          candidates,
        };
      })
      .sort((a, b) => b.volume - a.volume);

    if (markets.length > 0) {
      return NextResponse.json({ markets, source: 'live' });
    }

    return NextResponse.json({ markets: getFallbackBrazilData(), source: 'fallback' });
  } catch {
    return NextResponse.json({ markets: getFallbackBrazilData(), source: 'fallback' });
  }
}

function getFallbackBrazilData() {
  return [
    {
      id: 'br-presidential',
      title: 'Brazil Presidential Election 2026',
      slug: 'brazil-presidential-election',
      volume: 1200000,
      endDate: '2026-10-30',
      candidates: [
        { name: 'Lula (PT)', odds: 0.35 },
        { name: 'Tarcísio de Freitas', odds: 0.28 },
        { name: 'Jair Bolsonaro', odds: 0.15 },
        { name: 'Ciro Gomes', odds: 0.08 },
        { name: 'Outros', odds: 0.14 },
      ],
    },
    {
      id: 'br-senate',
      title: 'Next Brazil Senate Election - Most Seats Won',
      slug: 'next-brazil-senate-election-most-seats-won',
      volume: 600000,
      endDate: '2026-10-30',
      candidates: [
        { name: 'PT', odds: 0.30 },
        { name: 'PL', odds: 0.25 },
        { name: 'MDB', odds: 0.20 },
        { name: 'PSD', odds: 0.15 },
        { name: 'Outros', odds: 0.10 },
      ],
    },
  ];
}
