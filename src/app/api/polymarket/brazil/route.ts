import { NextResponse } from 'next/server';

const BRAZIL_KEYWORDS = ['brazil', 'lula', 'bolsonaro'];

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
    const searches = BRAZIL_KEYWORDS.map((keyword) =>
      fetch(
        `https://gamma-api.polymarket.com/events?limit=20&active=true&closed=false&order=volume&ascending=false&title=${encodeURIComponent(keyword)}`,
        {
          headers: { Accept: 'application/json' },
          next: { revalidate: 60 },
        }
      )
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
    );

    const results = await Promise.all(searches);

    const seen = new Set<string>();
    const allEvents: PolymarketEvent[] = [];
    for (const eventList of results) {
      if (Array.isArray(eventList)) {
        for (const event of eventList) {
          if (!seen.has(event.id) && event.active && !event.closed && event.markets?.length > 0) {
            seen.add(event.id);
            allEvents.push(event);
          }
        }
      }
    }

    const markets = allEvents
      .map((event) => {
        // Some events have multiple markets (multi-outcome)
        // Combine all markets' outcomes for multi-candidate events
        let candidates: { name: string; odds: number }[] = [];

        if (event.markets.length > 1) {
          // Multi-market event: each market is one candidate
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
          // Single market event
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
      id: 'br1',
      title: 'Brazil Presidential Election 2026 Winner',
      slug: '',
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
      id: 'br2',
      title: 'Lula reeleito em 2026?',
      slug: '',
      volume: 850000,
      endDate: '2026-10-30',
      candidates: [
        { name: 'Sim', odds: 0.35 },
        { name: 'Não', odds: 0.65 },
      ],
    },
    {
      id: 'br3',
      title: 'Bolsonaro elegível para concorrer em 2026?',
      slug: '',
      volume: 620000,
      endDate: '2026-06-30',
      candidates: [
        { name: 'Sim', odds: 0.12 },
        { name: 'Não', odds: 0.88 },
      ],
    },
    {
      id: 'br4',
      title: 'Tarcísio de Freitas candidato à presidência em 2026?',
      slug: '',
      volume: 480000,
      endDate: '2026-05-01',
      candidates: [
        { name: 'Sim', odds: 0.72 },
        { name: 'Não', odds: 0.28 },
      ],
    },
  ];
}
