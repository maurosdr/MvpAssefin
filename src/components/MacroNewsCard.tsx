'use client';

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'politics' | 'economy';
  imageUrl?: string;
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

function getCategoryColor(category: string) {
  return category === 'politics'
    ? { accent: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' }
    : { accent: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' };
}

export default function MacroNewsCard({ articles }: { articles: NewsArticle[] }) {
  if (articles.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {articles.map((article) => {
        const colors = getCategoryColor(article.category);
        return (
          <a
            key={article.id}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden hover:bg-gray-800/30 hover:border-gray-700 transition-all group"
          >
            {article.imageUrl && (
              <div className="relative h-40 w-full overflow-hidden bg-gray-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.imageUrl}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent) parent.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.accent} border ${colors.border}`}>
                  {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
                </span>
                <span className="text-[10px] text-gray-600 whitespace-nowrap">{formatTimeAgo(article.publishedAt)}</span>
              </div>
              <h3 className="text-sm text-white font-medium line-clamp-2 mb-2 group-hover:text-yellow-400 transition-colors">
                {article.title}
              </h3>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${colors.accent}`}>{article.source}</span>
                <svg className="w-4 h-4 text-gray-600 group-hover:text-yellow-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
