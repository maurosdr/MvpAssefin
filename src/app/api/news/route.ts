import { NextResponse } from 'next/server';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'politics' | 'crypto' | 'economy';
}

interface NewsAPIArticle {
  title: string;
  source: { name: string };
  url: string;
  publishedAt: string;
}

export async function GET() {
  try {
    // Attempt to fetch real news from a free API
    const apiKey = process.env.NEWS_API_KEY;

    if (apiKey) {
      const [politicsRes, cryptoRes, economyRes] = await Promise.all([
        fetch(`https://newsapi.org/v2/top-headlines?country=us&category=politics&pageSize=5&apiKey=${apiKey}`, {
          next: { revalidate: 300 },
        }),
        fetch(`https://newsapi.org/v2/everything?q=cryptocurrency+OR+bitcoin&sortBy=publishedAt&pageSize=2&apiKey=${apiKey}`, {
          next: { revalidate: 300 },
        }),
        fetch(`https://newsapi.org/v2/top-headlines?country=us&category=business&pageSize=3&apiKey=${apiKey}`, {
          next: { revalidate: 300 },
        }),
      ]);

      if (politicsRes.ok && cryptoRes.ok && economyRes.ok) {
        const [politicsData, cryptoData, economyData] = await Promise.all([
          politicsRes.json(),
          cryptoRes.json(),
          economyRes.json(),
        ]);

        const news: NewsItem[] = [
          ...((politicsData.articles || []) as NewsAPIArticle[]).slice(0, 5).map((a: NewsAPIArticle, i: number) => ({
            id: `politics-${i}`,
            title: a.title,
            source: a.source?.name || 'Unknown',
            url: a.url,
            publishedAt: a.publishedAt,
            category: 'politics' as const,
          })),
          ...((cryptoData.articles || []) as NewsAPIArticle[]).slice(0, 2).map((a: NewsAPIArticle, i: number) => ({
            id: `crypto-${i}`,
            title: a.title,
            source: a.source?.name || 'Unknown',
            url: a.url,
            publishedAt: a.publishedAt,
            category: 'crypto' as const,
          })),
          ...((economyData.articles || []) as NewsAPIArticle[]).slice(0, 3).map((a: NewsAPIArticle, i: number) => ({
            id: `economy-${i}`,
            title: a.title,
            source: a.source?.name || 'Unknown',
            url: a.url,
            publishedAt: a.publishedAt,
            category: 'economy' as const,
          })),
        ];

        return NextResponse.json({ news, source: 'live' });
      }
    }

    // Return fallback data if API key is not available or fetch fails
    return NextResponse.json({
      news: getFallbackNews(),
      source: 'cache',
    });
  } catch {
    return NextResponse.json({
      news: getFallbackNews(),
      source: 'cache',
    });
  }
}

function getFallbackNews(): NewsItem[] {
  const now = new Date();

  return [
    // Politics (5)
    {
      id: 'politics-1',
      title: 'Senate Passes Major Infrastructure Bill with Bipartisan Support',
      source: 'Reuters',
      url: '#',
      publishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      category: 'politics',
    },
    {
      id: 'politics-2',
      title: 'White House Announces New Trade Negotiations with EU Partners',
      source: 'AP News',
      url: '#',
      publishedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      category: 'politics',
    },
    {
      id: 'politics-3',
      title: 'Congressional Committee Holds Hearing on Tech Regulation',
      source: 'Bloomberg',
      url: '#',
      publishedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      category: 'politics',
    },
    {
      id: 'politics-4',
      title: 'Federal Reserve Chair Testifies Before Senate Banking Committee',
      source: 'CNBC',
      url: '#',
      publishedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      category: 'politics',
    },
    {
      id: 'politics-5',
      title: 'State Department Issues Travel Advisory Updates for Multiple Regions',
      source: 'WSJ',
      url: '#',
      publishedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString(),
      category: 'politics',
    },
    // Crypto (2)
    {
      id: 'crypto-1',
      title: 'Bitcoin Surges Past Key Resistance Level Amid Institutional Buying',
      source: 'CoinDesk',
      url: '#',
      publishedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      category: 'crypto',
    },
    {
      id: 'crypto-2',
      title: 'Ethereum Layer 2 Solutions See Record Transaction Volumes',
      source: 'The Block',
      url: '#',
      publishedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      category: 'crypto',
    },
    // Economy (3)
    {
      id: 'economy-1',
      title: 'US Jobs Report Exceeds Expectations with Strong Hiring Numbers',
      source: 'Financial Times',
      url: '#',
      publishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      category: 'economy',
    },
    {
      id: 'economy-2',
      title: 'Global Supply Chain Pressures Ease as Shipping Costs Decline',
      source: 'MarketWatch',
      url: '#',
      publishedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      category: 'economy',
    },
    {
      id: 'economy-3',
      title: 'Consumer Confidence Index Rises for Third Consecutive Month',
      source: 'Bloomberg',
      url: '#',
      publishedAt: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(),
      category: 'economy',
    },
  ];
}
