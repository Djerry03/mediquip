import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3004';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Ces pages sont personnelles ou transactionnelles : les indexer
      // n'apporte rien et exposerait des URL de suivi dans les moteurs.
      disallow: ['/admin', '/account', '/checkout', '/cart', '/tracking'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
