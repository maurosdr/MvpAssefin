'use client';

import { useEffect, useState } from 'react';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'politics' | 'crypto' | 'economy';
}

interface NewsSectionProps {
  category: 'politics' | 'crypto' | 'economy';
  title: string;
  icon: React.ReactNode;
  accentColor: string;
}

function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  } catch {
    return '';
  }
}

function NewsCard({ item, accentColor }: { item: NewsItem; accentColor: string }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 bg-gray-900/30 border border-gray-800 rounded-xl hover:bg-gray-800/50 hover:border-gray-700 transition-all group"
    >
      <h4 className="text-white text-sm font-medium line-clamp-2 group-hover:text-gray-200 transition-colors mb-2">
        {item.title}
      </h4>
      <div className="flex items-center justify-between text-xs">
        <span className={accentColor}>{item.source}</span>
        <span className="text-gray-500">{formatTimeAgo(item.publishedAt)}</span>
      </div>
    </a>
  );
}

export default function NewsSection({ category, title, icon, accentColor }: NewsSectionProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = () => {
      fetch('/api/news')
        .then((r) => r.json())
        .then((data) => {
          const filteredNews = (data.news || []).filter(
            (item: NewsItem) => item.category === category
          );
          setNews(filteredNews);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    fetchNews();
    // Refresh news every 5 minutes
    const interval = setInterval(fetchNews, 300000);
    return () => clearInterval(interval);
  }, [category]);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        {icon}
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded ml-auto ${accentColor} bg-gray-800`}>
          {news.length}
        </span>
      </div>
      <div className="p-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : news.length > 0 ? (
          news.map((item) => (
            <NewsCard key={item.id} item={item} accentColor={accentColor} />
          ))
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">No news available</p>
        )}
      </div>
    </div>
  );
}
