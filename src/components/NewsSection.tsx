'use client';

import { useEffect, useState } from 'react';

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'politics' | 'crypto' | 'economy';
}

interface NewsData {
  politics: NewsArticle[];
  crypto: NewsArticle[];
  economy: NewsArticle[];
  source: string;
}

interface CategoryConfig {
  key: 'politics' | 'crypto' | 'economy';
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  bgColor: string;
}

const categories: CategoryConfig[] = [
  {
    key: 'politics',
    title: 'Politics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    accentColor: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  {
    key: 'crypto',
    title: 'Crypto',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    accentColor: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
  },
  {
    key: 'economy',
    title: 'Economy',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    accentColor: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
];

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours === 1) return '1h ago';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

function NewsCard({ config, articles, loading }: { config: CategoryConfig; articles: NewsArticle[]; loading: boolean }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden h-full">
      <div className="px-5 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className={config.accentColor}>
            {config.icon}
          </div>
          <h3 className="text-base font-bold text-white">{config.title} News</h3>
        </div>
      </div>

      {loading ? (
        <div className="p-6 flex justify-center">
          <div className={`w-5 h-5 border-2 ${config.accentColor.replace('text-', 'border-')} border-t-transparent rounded-full animate-spin`} />
        </div>
      ) : (
        <div className="divide-y divide-gray-800/50">
          {articles.map((article) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-5 py-3 hover:bg-gray-800/30 transition-colors"
            >
              <h4 className="text-sm text-white font-medium line-clamp-2 mb-1.5">
                {article.title}
              </h4>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className={config.accentColor}>{article.source}</span>
                <span>{formatTimeAgo(article.publishedAt)}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewsSection() {
  const [data, setData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = () => {
      fetch('/api/news')
        .then((r) => r.json())
        .then((result) => {
          setData(result);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    fetchNews();
    const interval = setInterval(fetchNews, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            Latest News
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Top stories from Politics, Crypto, and Economy
          </p>
        </div>
        {data?.source === 'cache' && (
          <span className="text-xs bg-gray-800 text-gray-500 px-2 py-1 rounded">Cached</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((config) => (
          <NewsCard
            key={config.key}
            config={config}
            articles={data?.[config.key] || []}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}
