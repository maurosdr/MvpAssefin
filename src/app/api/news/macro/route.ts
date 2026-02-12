import { NextResponse } from 'next/server';

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'politics' | 'economy';
}

const RSS_FEEDS = [
  // US Politics & Economy
  { url: 'https://rss.politico.com/politics-news.xml', source: 'Politico', category: 'politics' as const },
  { url: 'https://feeds.bloomberg.com/markets/news.rss', source: 'Bloomberg', category: 'economy' as const },
  { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters', category: 'economy' as const },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml', source: 'NYT', category: 'economy' as const },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', source: 'NYT', category: 'politics' as const },
  // Brazilian sources
  { url: 'https://www.infomoney.com.br/feed/', source: 'InfoMoney', category: 'economy' as const },
  { url: 'https://rss.uol.com.br/feed/economia.xml', source: 'UOL Economia', category: 'economy' as const },
  { url: 'https://rss.uol.com.br/feed/politica.xml', source: 'UOL Politica', category: 'politics' as const },
];

async function fetchRSSFeed(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsFetcher/1.0)' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseRSSItems(xml: string, category: 'politics' | 'economy', source: string): NewsArticle[] {
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
        id: `macro-${category}-${source}-${items.length}-${Date.now()}`,
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
    const allArticles: NewsArticle[] = [];

    const feedPromises = RSS_FEEDS.map(async (feed) => {
      const xml = await fetchRSSFeed(feed.url);
      if (xml) {
        return parseRSSItems(xml, feed.category, feed.source);
      }
      return [];
    });

    const results = await Promise.all(feedPromises);
    for (const articles of results) {
      allArticles.push(...articles);
    }

    if (allArticles.length > 0) {
      // Sort by date descending
      allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      // Separate by category and ensure mix
      const politics = allArticles.filter((a) => a.category === 'politics');
      const economy = allArticles.filter((a) => a.category === 'economy');

      // Interleave politics and economy, take 10 total
      const mixed: NewsArticle[] = [];
      const maxPer = 5;
      for (let i = 0; i < maxPer; i++) {
        if (i < politics.length) mixed.push(politics[i]);
        if (i < economy.length) mixed.push(economy[i]);
      }

      return NextResponse.json({
        articles: mixed.slice(0, 10),
        source: 'live',
      });
    }

    return NextResponse.json({
      articles: getFallbackNews(),
      source: 'cache',
    });
  } catch {
    return NextResponse.json({
      articles: getFallbackNews(),
      source: 'cache',
    });
  }
}

function getFallbackNews(): NewsArticle[] {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

  return [
    { id: 'macro-1', title: 'Federal Reserve Signals Potential Rate Cut in Coming Months', source: 'Bloomberg', url: 'https://bloomberg.com', publishedAt: hoursAgo(1), category: 'economy' },
    { id: 'macro-2', title: 'Congress Debates New Infrastructure Bill Worth $1.2 Trillion', source: 'Politico', url: 'https://politico.com', publishedAt: hoursAgo(2), category: 'politics' },
    { id: 'macro-3', title: 'Banco Central do Brasil mantém Selic em 13,75% ao ano', source: 'InfoMoney', url: 'https://infomoney.com.br', publishedAt: hoursAgo(3), category: 'economy' },
    { id: 'macro-4', title: 'Senate Committee Approves Tech Regulation Framework', source: 'Reuters', url: 'https://reuters.com', publishedAt: hoursAgo(4), category: 'politics' },
    { id: 'macro-5', title: 'US Jobs Report Shows Stronger Than Expected Growth', source: 'NYT', url: 'https://nytimes.com', publishedAt: hoursAgo(5), category: 'economy' },
    { id: 'macro-6', title: 'Governo anuncia novo programa de investimentos em infraestrutura', source: 'UOL Politica', url: 'https://uol.com.br', publishedAt: hoursAgo(6), category: 'politics' },
    { id: 'macro-7', title: 'S&P 500 Hits All-Time High Amid Tech Rally', source: 'Bloomberg', url: 'https://bloomberg.com', publishedAt: hoursAgo(7), category: 'economy' },
    { id: 'macro-8', title: 'White House Announces New Trade Policy with EU Partners', source: 'Politico', url: 'https://politico.com', publishedAt: hoursAgo(8), category: 'politics' },
    { id: 'macro-9', title: 'Ibovespa renova máxima com fluxo estrangeiro recorde', source: 'InfoMoney', url: 'https://infomoney.com.br', publishedAt: hoursAgo(9), category: 'economy' },
    { id: 'macro-10', title: 'Treasury Yields Fall as Investors Anticipate Policy Shift', source: 'Reuters', url: 'https://reuters.com', publishedAt: hoursAgo(10), category: 'economy' },
  ];
}
