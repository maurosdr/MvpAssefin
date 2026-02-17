'use client';

import { useEffect, useState } from 'react';

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'politics' | 'crypto' | 'economy';
  imageUrl?: string;
  description?: string | null;
}

export default function CryptoFeaturedNews() {
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news', {
          cache: 'no-store',
        });
        const data = await res.json();
        // Sempre pega a primeira notícia mais recente (pode ter mudado)
        if (data.crypto && data.crypto.length > 0) {
          const newsItem = data.crypto[0];
          setArticle({
            ...newsItem,
            imageUrl: newsItem.thumbnail || newsItem.imageUrl || undefined,
          });
          setLastUpdate(new Date());
        } else if (data.economy && data.economy.length > 0) {
          const newsItem = data.economy[0];
          setArticle({
            ...newsItem,
            imageUrl: newsItem.thumbnail || newsItem.imageUrl || undefined,
          });
          setLastUpdate(new Date());
        }
      } catch {
        // Error handling
      } finally {
        setLoading(false);
      }
    };

    // Carrega imediatamente
    fetchNews();
    // Atualiza a cada 5 minutos (300000ms)
    const interval = setInterval(fetchNews, 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="modern-card h-full min-h-[600px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="modern-card h-full min-h-[600px] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Nenhuma notícia disponível</p>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  };

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="modern-card h-full min-h-[600px] flex flex-col overflow-hidden group cursor-pointer"
    >
      {/* Image Section */}
      <div className="relative h-64 bg-gradient-to-br from-[var(--accent-soft)] to-[var(--info-soft)] overflow-hidden">
        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-24 h-24 text-[var(--accent)] opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent" />
        
        {/* Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="px-3 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg">
            EXCLUSIVO TERMINAL
          </span>
          {lastUpdate && (
            <span className="px-2 py-1 bg-[var(--bg)]/90 backdrop-blur-sm text-[var(--text-muted)] rounded-lg text-[10px] font-medium">
              Atualizado {formatTime(article.publishedAt)}
            </span>
          )}
        </div>

        {/* Source & Time */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <span className="px-3 py-1.5 bg-[var(--bg)]/90 backdrop-blur-sm text-[var(--text-primary)] rounded-lg text-xs font-semibold">
            {article.source}
          </span>
          <span className="px-3 py-1.5 bg-[var(--bg)]/90 backdrop-blur-sm text-[var(--text-secondary)] rounded-lg text-xs font-medium">
            {formatTime(article.publishedAt)}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 flex flex-col p-8">
        <div className="mb-4">
          <span className="inline-block px-3 py-1 bg-[var(--accent-soft)] text-[var(--accent)] rounded-lg text-xs font-bold uppercase tracking-wider">
            {article.category === 'crypto' ? 'CRIPTOMOEDAS' : 'ECONOMIA'}
          </span>
        </div>

        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4 leading-tight group-hover:text-[var(--accent)] transition-colors">
          {article.title}
        </h2>

        <p className="text-[var(--text-secondary)] text-base leading-relaxed mb-6 flex-1 line-clamp-4">
          {article.description 
            ? article.description 
            : article.category === 'crypto' 
              ? 'Últimas atualizações e análises sobre o mercado de criptomoedas, incluindo tendências, regulamentações e movimentos de preços que impactam investidores globais.'
              : 'Notícias e análises sobre economia global, políticas monetárias, indicadores macroeconômicos e tendências que moldam os mercados financeiros.'}
        </p>

        <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)]">
          <span className="text-sm font-semibold text-[var(--accent)]">Ler mais</span>
          <svg className="w-5 h-5 text-[var(--accent)] group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>
    </a>
  );
}

