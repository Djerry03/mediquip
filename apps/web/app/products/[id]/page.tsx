import type { Metadata } from 'next';
import { fetchProduct, fetchProducts } from '../../lib/products.server';
import ProductDetail from './ProductDetail';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3004';

type Props = { params: { id: string } };

/** Pré-rend les fiches produit connues au build ; les autres restent dynamiques. */
export async function generateStaticParams() {
  const products = await fetchProducts();
  return products.map((p) => ({ id: p.slug || p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await fetchProduct(params.id);

  if (!product) {
    return { title: 'Produit introuvable', robots: { index: false, follow: false } };
  }

  const canonical = `/products/${product.slug || product.id}`;
  const description = product.desc.fr.slice(0, 155);

  return {
    title: product.name.fr,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: product.name.fr,
      description,
      url: `${SITE_URL}${canonical}`,
      images: product.images?.[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await fetchProduct(params.id);

  return (
    <>
      {/*
        Le HTML indexable et les données structurées sont produits côté
        serveur ; l'interactivité (variantes, panier, avis) reste cliente.
        Sans cela, un moteur de recherche ne verrait qu'une coquille vide.
      */}
      {product && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: product.name.fr,
              description: product.desc.fr,
              category: product.cat.fr,
              image: product.images?.map((src) => `${SITE_URL}${src}`),
              aggregateRating:
                product.reviews > 0
                  ? {
                      '@type': 'AggregateRating',
                      ratingValue: product.rating,
                      reviewCount: product.reviews,
                    }
                  : undefined,
              offers: {
                '@type': 'Offer',
                url: `${SITE_URL}/products/${product.slug || product.id}`,
                price: product.price,
                priceCurrency: 'XAF',
                availability: 'https://schema.org/InStock',
                availableDeliveryMethod:
                  product.livraison_autorisee === false
                    ? 'https://schema.org/InStorePickup'
                    : 'https://schema.org/OnSitePickup',
              },
            }),
          }}
        />
      )}

      {/* Contenu textuel servi dans le HTML initial, masqué visuellement :
          la version interactive ci-dessous le rend à nouveau côté client. */}
      {product && (
        <div className="sr-only">
          <h1>{product.name.fr}</h1>
          <p>{product.desc.fr}</p>
          <p>
            {product.price} FCFA — {product.cat.fr} — livraison {product.delay}
          </p>
        </div>
      )}

      <ProductDetail />
    </>
  );
}
