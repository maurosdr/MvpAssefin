import { NextResponse } from 'next/server';

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'politics' | 'crypto' | 'economy';
}

const CRYPTO_RSS_FEEDS = [
  'https://cointelegraph.com/rss',
  'https://decrypt.co/feed',
];

const POLITICS_RSS_FEEDS = [
  'https://rss.politico.com/politics-news.xml',
];

const ECONOMY_RSS_FEEDS = [
  'https://feeds.bloomberg.com/markets/news.rss',
];

async function fetchRSSFeed(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsFetcher/1.0)',
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseRSSItems(xml: string, category: 'politics' | 'crypto' | 'economy', source: string): NewsArticle[] {
  const items: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemContent = match[1];

    const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const linkMatch = itemContent.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
    const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

    if (titleMatch && linkMatch) {
      items.push({
        id: `${category}-${items.length}-${Date.now()}`,
        title: titleMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, ''),
        source,
        url: linkMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, ''),
        publishedAt: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
        category,
      });
    }
  }

  return items;
}

export async function GET() {
  try {
    const cryptoNews: NewsArticle[] = [];
    const politicsNews: NewsArticle[] = [];
    const economyNews: NewsArticle[] = [];

    // Fetch crypto news
    for (const feed of CRYPTO_RSS_FEEDS) {
      const xml = await fetchRSSFeed(feed);
      if (xml) {
        const source = feed.includes('cointelegraph') ? 'CoinTelegraph' : 'Decrypt';
        cryptoNews.push(...parseRSSItems(xml, 'crypto', source));
      }
    }

    // Fetch politics news
    for (const feed of POLITICS_RSS_FEEDS) {
      const xml = await fetchRSSFeed(feed);
      if (xml) {
        politicsNews.push(...parseRSSItems(xml, 'politics', 'Politico'));
      }
    }

    // Fetch economy news
    for (const feed of ECONOMY_RSS_FEEDS) {
      const xml = await fetchRSSFeed(feed);
      if (xml) {
        economyNews.push(...parseRSSItems(xml, 'economy', 'Bloomberg'));
      }
    }

    // If we got any live news, return it
    if (cryptoNews.length > 0 || politicsNews.length > 0 || economyNews.length > 0) {
      return NextResponse.json({
        politics: politicsNews.slice(0, 5),
        crypto: cryptoNews.slice(0, 5),
        economy: economyNews.slice(0, 5),
        source: 'live',
      });
    }

    // Fallback to mock data
    return NextResponse.json({
      ...getFallbackNews(),
      source: 'cache',
    });
  } catch {
    return NextResponse.json({
      ...getFallbackNews(),
      source: 'cache',
    });
  }
}

function getFallbackNews() {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

  return {
    politics: [
      { id: 'pol-1', title: 'Congress Debates New Infrastructure Bill Worth $1.2 Trillion', source: 'Politico', url: 'https://politico.com', publishedAt: hoursAgo(1), category: 'politics' },
      { id: 'pol-2', title: 'Senate Committee Approves Tech Regulation Framework', source: 'Reuters', url: 'https://reuters.com', publishedAt: hoursAgo(2), category: 'politics' },
      { id: 'pol-3', title: 'White House Announces New Trade Policy with EU Partners', source: 'AP News', url: 'https://apnews.com', publishedAt: hoursAgo(4), category: 'politics' },
      { id: 'pol-4', title: 'Federal Court Rules on Major Antitrust Case Against Big Tech', source: 'WSJ', url: 'https://wsj.com', publishedAt: hoursAgo(6), category: 'politics' },
      { id: 'pol-5', title: 'State Governors Meet to Discuss Climate Change Initiatives', source: 'NYT', url: 'https://nytimes.com', publishedAt: hoursAgo(8), category: 'politics' },
    ],
    crypto: [
      { id: 'cry-1', title: 'Bitcoin Surges Past $100k as Institutional Adoption Accelerates', source: 'CoinTelegraph', url: 'https://cointelegraph.com', publishedAt: hoursAgo(1), category: 'crypto' },
      { id: 'cry-2', title: 'Ethereum Layer 2 Solutions See Record Transaction Volume', source: 'Decrypt', url: 'https://decrypt.co', publishedAt: hoursAgo(3), category: 'crypto' },
      { id: 'cry-3', title: 'SEC Approves New Cryptocurrency ETF Applications', source: 'CoinDesk', url: 'https://coindesk.com', publishedAt: hoursAgo(5), category: 'crypto' },
      { id: 'cry-4', title: 'Major Bank Launches Crypto Custody Service for Clients', source: 'The Block', url: 'https://theblock.co', publishedAt: hoursAgo(7), category: 'crypto' },
      { id: 'cry-5', title: 'DeFi Protocol Records $50B in Total Value Locked', source: 'CoinTelegraph', url: 'https://cointelegraph.com', publishedAt: hoursAgo(9), category: 'crypto' },
    ],
    economy: [
      { id: 'eco-1', title: 'Federal Reserve Signals Potential Rate Cut in Coming Months', source: 'Bloomberg', url: 'https://bloomberg.com', publishedAt: hoursAgo(1), category: 'economy' },
      { id: 'eco-2', title: 'US Jobs Report Shows Stronger Than Expected Growth', source: 'CNBC', url: 'https://cnbc.com', publishedAt: hoursAgo(2), category: 'economy' },
      { id: 'eco-3', title: 'S&P 500 Hits All-Time High Amid Tech Rally', source: 'MarketWatch', url: 'https://marketwatch.com', publishedAt: hoursAgo(4), category: 'economy' },
      { id: 'eco-4', title: 'Inflation Data Shows Continued Cooling Trend', source: 'Reuters', url: 'https://reuters.com', publishedAt: hoursAgo(6), category: 'economy' },
      { id: 'eco-5', title: 'Treasury Yields Fall as Investors Anticipate Policy Shift', source: 'FT', url: 'https://ft.com', publishedAt: hoursAgo(8), category: 'economy' },
    ],
  };
}
