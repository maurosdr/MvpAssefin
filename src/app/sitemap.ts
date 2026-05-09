import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://assefin.com.br';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: Array<{ path: string; changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '/', changeFrequency: 'daily' },
    { path: '/markets', changeFrequency: 'hourly' },
    { path: '/crypto', changeFrequency: 'hourly' },
    { path: '/stocks', changeFrequency: 'daily' },
    { path: '/subscription', changeFrequency: 'weekly' },
  ];

  return routes.map((r) => ({
    url: new URL(r.path, SITE_URL).toString(),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.path === '/' ? 1 : 0.7,
  }));
}

