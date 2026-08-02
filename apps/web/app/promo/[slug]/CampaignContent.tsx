'use client';

import React from 'react';
import Link from 'next/link';
import { Product, useApp } from '../../context/AppContext';
import ProductCard from '../../components/ProductCard';
import Reveal from '../../components/Reveal';
import type { CampaignPage } from '../../lib/products.server';

export default function CampaignContent({ page }: { page: CampaignPage }) {
  const { lang, showToast } = useApp();

  const t = {
    fr: {
      code: 'Code promo',
      copy: 'Copier',
      copied: 'Code copié.',
      apply: 'À saisir dans le panier au moment de valider votre commande.',
      selection: 'La sélection',
      empty: 'Les produits de cette campagne ne sont plus disponibles.',
      browse: 'Voir tout le catalogue',
    },
    en: {
      code: 'Promo code',
      copy: 'Copy',
      copied: 'Code copied.',
      apply: 'Enter it in the cart when confirming your order.',
      selection: 'The selection',
      empty: 'The products of this campaign are no longer available.',
      browse: 'See the full catalog',
    },
  }[lang];

  const copyCode = async () => {
    if (!page.promotionCode) return;
    try {
      await navigator.clipboard.writeText(page.promotionCode);
      showToast(t.copied);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : le code reste
      // affiché en clair, l'utilisateur peut le recopier à la main.
      showToast(page.promotionCode);
    }
  };

  return (
    <>
      <header
        className="promo-hero"
        style={{
          background: page.backgroundColor || 'var(--forest)',
          color: page.textColor || '#fff',
          backgroundImage: page.heroImageUrl ? `url(${page.heroImageUrl})` : undefined,
        }}
      >
        <h1>{page.title[lang]}</h1>
        {page.subtitle && <p className="promo-subtitle">{page.subtitle[lang]}</p>}

        {page.promotionCode && (
          <div className="promo-code-box">
            <span className="promo-code-label">{t.code}</span>
            <code className="promo-code">{page.promotionCode}</code>
            <button
              type="button"
              className="promo-copy"
              onClick={copyCode}
              style={{ color: page.backgroundColor || 'var(--forest)' }}
            >
              {t.copy}
            </button>
          </div>
        )}
        {page.promotionCode && <small className="promo-apply">{t.apply}</small>}
      </header>

      {page.paragraphs.length > 0 && (
        <section className="promo-body">
          {page.paragraphs.map((paragraph, i) => (
            <Reveal key={i} delay={i * 60}>
              <p>{paragraph[lang]}</p>
            </Reveal>
          ))}
        </section>
      )}

      <section className="section">
        <Reveal>
          <div className="section-head">
            <h2>{t.selection}</h2>
            <Link href="/catalog" className="link">
              {t.browse} →
            </Link>
          </div>
        </Reveal>

        {page.products.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)' }}>{t.empty}</p>
        ) : (
          <div className="grid-products">
            {page.products.map((product, i) => (
              <Reveal key={product.id} delay={(i % 8) * 50}>
                <ProductCard p={product as unknown as Product} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
