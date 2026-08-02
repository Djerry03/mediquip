import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3004';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type Product = { id: string; slug?: string };

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '', priority: 1, changeFrequency: 'daily' },
  { path: '/catalog', priority: 0.9, changeFrequency: 'daily' },
  { path: '/packs', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/upload-list', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/b2b', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/tracking', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/legal/cgv', priority: 0.3, changeFrequency: 'monthly' },
  { path: '/legal/mentions-legales', priority: 0.3, changeFrequency: 'monthly' },
  { path: '/legal/confidentialite', priority: 0.3, changeFrequency: 'monthly' },
  { path: '/legal/retours', priority: 0.3, changeFrequency: 'monthly' },
];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Le catalogue vient de l'API. Si elle est injoignable au build, on publie
  // les pages statiques plutôt que d'échouer et de ne rien produire du tout.
  let products: Product[] = [];
  try {
    const res = await fetch(`${API_URL}/products`, { next: { revalidate } });
    if (res.ok) products = await res.json();
  } catch {
    products = [];
  }

  // Les pages de campagne en cours sont indexables tant qu'elles sont
  // diffusées ; elles disparaissent du plan du site à leur expiration.
  let campaignSlugs: string[] = [];
  try {
    // Pas de cache : une campagne dépubliée doit quitter le plan du site
    // aussi vite qu'elle quitte le site lui-même.
    const res = await fetch(`${API_URL}/campaign-pages/live`, { cache: 'no-store' });
    if (res.ok) campaignSlugs = await res.json();
  } catch {
    campaignSlugs = [];
  }

  return [
    ...staticEntries,
    ...products.map((p) => ({
      url: `${SITE_URL}/products/${p.slug || p.id}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...campaignSlugs.map((slug) => ({
      url: `${SITE_URL}/promo/${slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ];
}
