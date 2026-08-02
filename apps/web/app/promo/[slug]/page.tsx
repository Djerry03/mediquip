import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchCampaignPage } from '../../lib/products.server';
import CampaignContent from './CampaignContent';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3004';

type Props = { params: { slug: string } };

/**
 * Rendu à chaque requête. Une campagne se publie et se dépublie à la minute
 * près depuis le back-office : la mettre en cache ferait mentir la fenêtre
 * de diffusion. Le coût est une lecture d'API par visite, négligeable pour
 * une page qui liste au plus deux douzaines de produits.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await fetchCampaignPage(params.slug);

  // Une campagne dépubliée ne doit pas rester dans l'index des moteurs.
  if (!page) {
    return { title: 'Campagne terminée', robots: { index: false, follow: false } };
  }

  const description = page.seoDescription?.fr || page.subtitle?.fr || page.title.fr;

  return {
    title: page.title.fr,
    description: description.slice(0, 155),
    alternates: { canonical: `/promo/${page.slug}` },
    openGraph: {
      type: 'website',
      title: page.title.fr,
      description: description.slice(0, 155),
      url: `${SITE_URL}/promo/${page.slug}`,
      images: page.heroImageUrl ? [{ url: page.heroImageUrl }] : undefined,
    },
  };
}

export default async function CampaignPage({ params }: Props) {
  const page = await fetchCampaignPage(params.slug);
  if (!page) notFound();

  return (
    <>
      {/*
        Contenu servi dans le HTML initial : une page de campagne existe pour
        être trouvée par les moteurs et partagée. La version interactive
        (panier, langue) est rendue par le composant client ci-dessous.
      */}
      <div className="sr-only">
        <h1>{page.title.fr}</h1>
        {page.subtitle && <p>{page.subtitle.fr}</p>}
        {page.paragraphs.map((p, i) => (
          <p key={i}>{p.fr}</p>
        ))}
        <ul>
          {page.products.map((product) => (
            <li key={product.id}>
              {product.name.fr} — {product.price} FCFA
            </li>
          ))}
        </ul>
      </div>

      <CampaignContent page={page} />
    </>
  );
}
