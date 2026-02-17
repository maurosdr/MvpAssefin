'use client';

import { useEffect, useState } from 'react';

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'politics' | 'economy';
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function padSource(source: string): string {
  return source.toUpperCase().padEnd(12);
}

const categoryColors: Record<string, { text: string; bg: string }> = {
  politics: { text: 'text-blue-400', bg: 'bg-blue-500/20' },
  economy: { text: 'text-green-400', bg: 'bg-green-500/20' },
};

export default function BloombergNewsTicker() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news/macro', { cache: 'no-store' });
        const data = await res.json();
        if (data.articles && Array.isArray(data.articles)) {
          setArticles(data.articles);
          setLastRefresh(new Date());
        }
      } catch {
        // fetch failed
      } finally {
        setLoading(false);
      }
    };

    // Delay para não competir com outras chamadas
    const timeout = setTimeout(fetchNews, 700);
    const interval = setInterval(fetchNews, 1_800_000); // 30 minutes
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-400 rounded-sm" />
            <div className="w-2 h-2 bg-amber-400 rounded-sm" />
            <div className="w-2 h-2 bg-amber-400 rounded-sm" />
          </div>
          <h2 className="font-[family-name:var(--font-geist-mono)] text-sm font-bold text-amber-400 tracking-wider">
            NEWS WIRE
          </h2>
          <span className="font-[family-name:var(--font-geist-mono)] text-xs text-gray-600">
            |
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text-muted)]">
            GLOBAL MACRO & POLITICS
          </span>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-gray-600">
              UPD {formatTime(lastRefresh.toISOString())}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--text-muted)]">
              LIVE 30m
            </span>
          </div>
        </div>
      </div>

      {/* News rows */}
      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-800/40">
          {articles.map((article, index) => {
            const colors = categoryColors[article.category] || categoryColors.economy;
            return (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-800/40 transition-colors group"
              >
                {/* Line number */}
                <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-gray-700 w-4 text-right shrink-0">
                  {String(index + 1).padStart(2, '0')}
                </span>

                {/* Timestamp */}
                <span className="font-[family-name:var(--font-geist-mono)] text-xs text-amber-400/80 shrink-0">
                  {formatTime(article.publishedAt)}
                </span>

                {/* Source */}
                <span className="font-[family-name:var(--font-geist-mono)] text-xs text-yellow-500/70 shrink-0 w-24 truncate">
                  {padSource(article.source)}
                </span>

                {/* Separator */}
                <span className="font-[family-name:var(--font-geist-mono)] text-gray-700 shrink-0">|</span>

                {/* Headline */}
                <span className="font-[family-name:var(--font-geist-mono)] text-xs text-gray-300 group-hover:text-[var(--text)] transition-colors truncate flex-1">
                  {article.title}
                </span>

                {/* Category badge */}
                <span className={`font-[family-name:var(--font-geist-mono)] text-[10px] px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} shrink-0`}>
                  {article.category.toUpperCase()}
                </span>
              </a>
            );
          })}

          {articles.length === 0 && (
            <div className="px-5 py-6 text-center">
              <span className="font-[family-name:var(--font-geist-mono)] text-xs text-gray-600">
                NO DATA AVAILABLE
              </span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-2 border-t border-[var(--border)]/60 flex items-center justify-between">
        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-gray-700">
          Sources: Bloomberg, Politico, Reuters, NYT, InfoMoney, UOL
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-gray-700">
          {articles.length} items
        </span>
      </div>
    </div>
  );
}
