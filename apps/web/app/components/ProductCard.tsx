'use client';

import React from 'react';
import Link from 'next/link';
import { Product, formatFcfa, useApp } from '../context/AppContext';
import { mediaUrl } from '../lib/api';

const FLAG_LABELS: Record<string, { fr: string; en: string }> = {
  bestseller: { fr: 'Best-seller', en: 'Bestseller' },
  new: { fr: 'Nouveauté', en: 'New' },
  promo: { fr: 'Promo', en: 'Sale' },
  pack: { fr: 'Pack', en: 'Pack' },
  'chaine-froid': { fr: 'Chaîne du froid', en: 'Cold chain' },
  'retrait-uniquement': { fr: 'Retrait en boutique', en: 'In-store pickup' },
  ordonnance: { fr: 'Sur ordonnance', en: 'Prescription' },
};

/** Seuls ces badges sont affichés en vignette, pour ne pas surcharger la carte. */
const VISIBLE_FLAGS = ['promo', 'bestseller', 'new', 'pack'];

export function flagLabel(flag: string, lang: 'fr' | 'en'): string {
  return FLAG_LABELS[flag]?.[lang] ?? flag;
}

export function ProductMedia({
  product,
  className = 'card-media',
}: {
  product: Product;
  className?: string;
}) {
  const image = mediaUrl(product.images?.[0]);
  if (!image) {
    return <span className="ph">✚</span>;
  }
  return (
    // Les visuels viennent de deux origines (Next pour ceux livrés avec le
    // site, l'API pour ceux téléversés) : `next/image` imposerait de déclarer
    // chaque domaine sans rien apporter à des vignettes de cette taille.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt={product.name?.fr ?? ''}
      loading="lazy"
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}

export default function ProductCard({ p }: { p: Product }) {
  const { lang, addToCart } = useApp();

  const tags = (p.flags || [])
    .filter((f) => VISIBLE_FLAGS.includes(f))
    .map((f) => (
      <span key={f} className={`tag ${f === 'promo' ? 'promo' : ''}`}>
        {flagLabel(f, lang)}
      </span>
    ));

  const roundedRating = Math.round(p.rating || 0);
  const stars = '★'.repeat(roundedRating) + '☆'.repeat(Math.max(0, 5 - roundedRating));
  const pickupOnly = p.livraison_autorisee === false;

  return (
    <div className="card">
      <Link href={`/products/${p.slug || p.id}` as any} className="card-media">
        {tags}
        <ProductMedia product={p} />
      </Link>
      <div className="card-body">
        <span className="cat">{p.cat?.[lang]}</span>
        <Link href={`/products/${p.slug || p.id}` as any}>
          <h3>{p.name?.[lang]}</h3>
        </Link>
        <span className="stars">
          {stars} <span style={{ color: 'var(--ink-soft)' }}>({p.reviews || 0})</span>
        </span>
        <div className="price-row">
          <span className="price">{formatFcfa(p.price)}</span>
          {p.oldPrice && p.oldPrice > p.price && (
            <span className="price-old">{formatFcfa(p.oldPrice)}</span>
          )}
        </div>
        <span className="delay">
          {pickupOnly
            ? `🏪 ${lang === 'fr' ? 'Retrait en boutique uniquement' : 'In-store pickup only'}`
            : `⏱ ${lang === 'fr' ? 'Livré en' : 'Delivered in'} ${p.delay}`}
        </span>
        <button
          className="add-btn"
          onClick={() => addToCart(p.id, p.variants?.color?.[0], p.variants?.size?.[0], 1)}
        >
          {lang === 'fr' ? 'Ajouter au panier' : 'Add to cart'}
        </button>
      </div>
    </div>
  );
}
