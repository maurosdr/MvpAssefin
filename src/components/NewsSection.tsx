'use client';

import { useEffect, useState } from 'react';

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'politics' | 'crypto' | 'economy';
  thumbnail?: string | null;
}

interface NewsData {
  politics: NewsArticle[];
  crypto: NewsArticle[];
  economy: NewsArticle[];
  source: string;
}

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

export default function NewsSection() {
  const [data, setData] = useState<NewsData | null>(null);

  useEffect(() => {
    fetch('/api/news')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return null;

  return (
    <div className="space-y-24">
      <CategorySection title="Politics" articles={data.politics} />
      <CategorySection title="Crypto" articles={data.crypto} />
      <CategorySection title="Economy" articles={data.economy} />
    </div>
  );
}

function CategorySection({
  title,
  articles,
}: {
  title: string;
  articles: NewsArticle[];
}) {
  return (
    <section>
      <div className="mb-10">
        <h2 className="text-3xl font-extrabold text-white">{title}</h2>
        <div className="mt-3 h-px bg-gray-800" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {articles.slice(0, 6).map((article) => (
          <a
            key={article.id}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden"
          >
            <div className="aspect-square bg-gray-800 overflow-hidden">
              {article.thumbnail && (
                <img
                  src={article.thumbnail}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
            </div>

            <div className="p-5">
              <h3 className="text-xl font-bold text-white leading-snug mb-3 line-clamp-3">
                {article.title}
              </h3>

              <div className="text-sm text-gray-500">
                {article.source} · {formatTimeAgo(article.publishedAt)}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
