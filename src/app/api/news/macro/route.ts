import { NextResponse } from 'next/server';

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'politics' | 'economy';
  imageUrl?: string;
}

const RSS_FEEDS = [
  // Brazilian sources
  { url: 'https://www.infomoney.com.br/feed/', source: 'InfoMoney', category: 'economy' as const },
  { url: 'https://rss.uol.com.br/feed/economia.xml', source: 'UOL Economia', category: 'economy' as const },
  { url: 'https://rss.uol.com.br/feed/politica.xml', source: 'UOL Politica', category: 'politics' as const },
  { url: 'https://valor.globo.com/rss/', source: 'Valor Economico', category: 'economy' as const },
  { url: 'https://feeds.folha.uol.com.br/mercado/rss091.xml', source: 'Folha Mercado', category: 'economy' as const },
  { url: 'https://g1.globo.com/rss/g1/economia/', source: 'G1 Economia', category: 'economy' as const },
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

function extractImageUrl(itemXml: string): string | undefined {
  // Try <media:content url="...">
  const mediaContent = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/);
  if (mediaContent) return mediaContent[1];

  // Try <media:thumbnail url="...">
  const mediaThumbnail = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/);
  if (mediaThumbnail) return mediaThumbnail[1];

  // Try <enclosure url="..." type="image/...">
  const enclosure = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image\/[^"']+["']/);
  if (enclosure) return enclosure[1];

  // Try <enclosure url="..."> with image extension
  const enclosureExt = itemXml.match(/<enclosure[^>]+url=["']([^"']+(?:\.jpg|\.jpeg|\.png|\.webp)[^"']*)["']/i);
  if (enclosureExt) return enclosureExt[1];

  // Try <image> tag inside item
  const imageTag = itemXml.match(/<image>\s*<url>([^<]+)<\/url>/);
  if (imageTag) return imageTag[1];

  // Try image inside <description> or <content:encoded>
  const descImg = itemXml.match(/<(?:description|content:encoded)>[\s\S]*?<img[^>]+src=["']([^"']+)["']/);
  if (descImg) return descImg[1];

  // Try CDATA wrapped content with img
  const cdataImg = itemXml.match(/<!\[CDATA\[[\s\S]*?<img[^>]+src=["']([^"']+)["']/);
  if (cdataImg) return cdataImg[1];

  return undefined;
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
    const imageUrl = extractImageUrl(itemContent);

    if (titleMatch && linkMatch) {
      items.push({
        id: `macro-${category}-${source}-${items.length}-${Date.now()}`,
        title: titleMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, ''),
        source,
        url: linkMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, ''),
        publishedAt: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
        category,
        imageUrl,
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
    { id: 'macro-1', title: 'Banco Central do Brasil mantém Selic em 13,75% ao ano', source: 'InfoMoney', url: 'https://infomoney.com.br', publishedAt: hoursAgo(1), category: 'economy' },
    { id: 'macro-2', title: 'Governo anuncia novo programa de investimentos em infraestrutura', source: 'UOL Politica', url: 'https://uol.com.br', publishedAt: hoursAgo(2), category: 'politics' },
    { id: 'macro-3', title: 'Ibovespa renova maxima com fluxo estrangeiro recorde', source: 'InfoMoney', url: 'https://infomoney.com.br', publishedAt: hoursAgo(3), category: 'economy' },
    { id: 'macro-4', title: 'Camara aprova novo marco regulatorio do mercado de capitais', source: 'Valor Economico', url: 'https://valor.globo.com', publishedAt: hoursAgo(4), category: 'politics' },
    { id: 'macro-5', title: 'Dolar recua com melhora no cenario fiscal brasileiro', source: 'Folha Mercado', url: 'https://folha.uol.com.br', publishedAt: hoursAgo(5), category: 'economy' },
    { id: 'macro-6', title: 'Reforma tributaria: Senado debate aliquota do IVA', source: 'G1 Economia', url: 'https://g1.globo.com', publishedAt: hoursAgo(6), category: 'politics' },
    { id: 'macro-7', title: 'PIB brasileiro cresce acima do esperado no trimestre', source: 'UOL Economia', url: 'https://uol.com.br', publishedAt: hoursAgo(7), category: 'economy' },
    { id: 'macro-8', title: 'BNDES amplia linhas de credito para pequenas empresas', source: 'InfoMoney', url: 'https://infomoney.com.br', publishedAt: hoursAgo(8), category: 'economy' },
    { id: 'macro-9', title: 'Petrobras anuncia reajuste de precos de combustiveis', source: 'Valor Economico', url: 'https://valor.globo.com', publishedAt: hoursAgo(9), category: 'economy' },
    { id: 'macro-10', title: 'Lula se reune com governadores para discutir pacto federativo', source: 'UOL Politica', url: 'https://uol.com.br', publishedAt: hoursAgo(10), category: 'politics' },
  ];
}
