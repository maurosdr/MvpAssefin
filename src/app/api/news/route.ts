import { NextResponse } from 'next/server';

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'politics' | 'crypto' | 'economy';
  thumbnail?: string | null;
  description?: string | null;
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
    const descriptionMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    const contentMatch = itemContent.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/);
    const thumbnailMatch =
      itemContent.match(/<media:thumbnail[^>]*url="([^"]+)"/) ||
      itemContent.match(/<media:content[^>]*url="([^"]+)"/) ||
      itemContent.match(/<img[^>]*src="([^"]+)"/i) ||
      itemContent.match(
      /(https?:\/\/[^\s"'<>]+?\.(jpg|jpeg|png|webp|gif))/i
    );

    if (titleMatch && linkMatch) {
      // Extrair descrição do RSS (description ou content:encoded)
      let description: string | null = null;
      if (contentMatch) {
        description = contentMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, '');
        // Remover HTML tags e limitar tamanho
        description = description.replace(/<[^>]*>/g, '').substring(0, 300);
      } else if (descriptionMatch) {
        description = descriptionMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, '');
        // Remover HTML tags e limitar tamanho
        description = description.replace(/<[^>]*>/g, '').substring(0, 300);
      }

      items.push({
        id: `${category}-${items.length}-${Date.now()}`,
        title: titleMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, ''),
        source,
        url: linkMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, ''),
        publishedAt: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
        category,
        thumbnail: thumbnailMatch ? thumbnailMatch[1] : null,
        description: description || null,
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
        politics: politicsNews.slice(0, 6),
        crypto: cryptoNews.slice(0, 6),
        economy: economyNews.slice(0, 6),
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
      { id: 'pol-1', title: 'Congress Debates New Infrastructure Bill Worth $1.2 Trillion', source: 'Politico', url: 'https://politico.com', publishedAt: hoursAgo(1), category: 'politics', description: 'Lawmakers are engaged in intense negotiations over a massive infrastructure spending package that could reshape American transportation and energy systems.' },
      { id: 'pol-2', title: 'Senate Committee Approves Tech Regulation Framework', source: 'Reuters', url: 'https://reuters.com', publishedAt: hoursAgo(2), category: 'politics', description: 'A bipartisan committee has advanced legislation aimed at increasing oversight of major technology companies and their data practices.' },
      { id: 'pol-3', title: 'White House Announces New Trade Policy with EU Partners', source: 'AP News', url: 'https://apnews.com', publishedAt: hoursAgo(4), category: 'politics', description: 'The administration unveiled a comprehensive trade agreement framework designed to strengthen economic ties with European allies.' },
      { id: 'pol-4', title: 'Federal Court Rules on Major Antitrust Case Against Big Tech', source: 'WSJ', url: 'https://wsj.com', publishedAt: hoursAgo(6), category: 'politics', description: 'A landmark court decision could reshape how antitrust laws are applied to dominant technology platforms.' },
      { id: 'pol-5', title: 'State Governors Meet to Discuss Climate Change Initiatives', source: 'NYT', url: 'https://nytimes.com', publishedAt: hoursAgo(8), category: 'politics', description: 'State leaders convened to coordinate regional strategies for addressing climate change and transitioning to renewable energy.' },
      { id: 'pol-6', title: 'Supreme Court Hears Arguments on Voting Rights Legislation', source: 'CNN', url: 'https://cnn.com', publishedAt: hoursAgo(10), category: 'politics', description: 'The nations highest court is considering a case that could significantly impact voting access and election procedures across the country.' },
    ],
    crypto: [
      { id: 'cry-1', title: 'Bitcoin Surges Past $100k as Institutional Adoption Accelerates', source: 'CoinTelegraph', url: 'https://cointelegraph.com', publishedAt: hoursAgo(1), category: 'crypto', description: 'Bitcoin reached new all-time highs as major corporations and investment funds continue to add cryptocurrency to their balance sheets, signaling mainstream acceptance.' },
      { id: 'cry-2', title: 'Ethereum Layer 2 Solutions See Record Transaction Volume', source: 'Decrypt', url: 'https://decrypt.co', publishedAt: hoursAgo(3), category: 'crypto', description: 'Scaling solutions built on Ethereum are processing unprecedented transaction volumes, reducing fees and improving network efficiency.' },
      { id: 'cry-3', title: 'SEC Approves New Cryptocurrency ETF Applications', source: 'CoinDesk', url: 'https://coindesk.com', publishedAt: hoursAgo(5), category: 'crypto', description: 'Regulatory approval of new crypto exchange-traded funds opens the door for broader institutional investment in digital assets.' },
      { id: 'cry-4', title: 'Major Bank Launches Crypto Custody Service for Clients', source: 'The Block', url: 'https://theblock.co', publishedAt: hoursAgo(7), category: 'crypto', description: 'A leading financial institution has introduced secure cryptocurrency storage services, enabling traditional investors to safely hold digital assets.' },
      { id: 'cry-5', title: 'DeFi Protocol Records $50B in Total Value Locked', source: 'CoinTelegraph', url: 'https://cointelegraph.com', publishedAt: hoursAgo(9), category: 'crypto', description: 'Decentralized finance platforms have reached a major milestone in total assets locked, demonstrating growing confidence in smart contract-based financial services.' },
      { id: 'cry-6', title: 'NFT Market Sees Resurgence with New Utility-Focused Projects', source: 'Decrypt', url: 'https://decrypt.co', publishedAt: hoursAgo(11), category: 'crypto', description: 'Non-fungible token platforms are experiencing renewed interest as projects focus on real-world utility and integration with traditional industries.' },
    ],
    economy: [
      { id: 'eco-1', title: 'Federal Reserve Signals Potential Rate Cut in Coming Months', source: 'Bloomberg', url: 'https://bloomberg.com', publishedAt: hoursAgo(1), category: 'economy', description: 'Central bank officials hint at monetary policy adjustments as economic indicators suggest a shift in inflation and growth expectations.' },
      { id: 'eco-2', title: 'US Jobs Report Shows Stronger Than Expected Growth', source: 'CNBC', url: 'https://cnbc.com', publishedAt: hoursAgo(2), category: 'economy', description: 'Employment data exceeded analyst forecasts, indicating robust labor market conditions and potential implications for interest rate policy.' },
      { id: 'eco-3', title: 'S&P 500 Hits All-Time High Amid Tech Rally', source: 'MarketWatch', url: 'https://marketwatch.com', publishedAt: hoursAgo(4), category: 'economy', description: 'Major stock indices reached record levels as technology companies led a broad market advance, driven by strong earnings and optimistic outlooks.' },
      { id: 'eco-4', title: 'Inflation Data Shows Continued Cooling Trend', source: 'Reuters', url: 'https://reuters.com', publishedAt: hoursAgo(6), category: 'economy', description: 'Price growth metrics indicate a sustained moderation in inflation, providing relief to consumers and policymakers alike.' },
      { id: 'eco-5', title: 'Treasury Yields Fall as Investors Anticipate Policy Shift', source: 'FT', url: 'https://ft.com', publishedAt: hoursAgo(8), category: 'economy', description: 'Government bond yields declined as market participants position for potential changes in monetary policy and economic conditions.' },
      { id: 'eco-6', title: 'Global Supply Chain Disruptions Ease as Shipping Costs Normalize', source: 'WSJ', url: 'https://wsj.com', publishedAt: hoursAgo(10), category: 'economy', description: 'International trade flows are stabilizing as transportation costs return to pre-pandemic levels, easing pressure on consumer prices.' },
    ],
  };
}
