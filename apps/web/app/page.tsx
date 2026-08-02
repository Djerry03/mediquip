'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Product, useApp } from './context/AppContext';
import { apiFetch } from './lib/api';
import ProductCard from './components/ProductCard';
import Reveal from './components/Reveal';
import Banner from './components/Banner';

const MapSimulator = dynamic(() => import('./components/MapSimulator'), { ssr: false });

export default function HomePage() {
  const { lang, products, productsLoading, productsError } = useApp();

  // Sélection décidée au back-office ; l'API retombe d'elle-même sur un tri
  // automatique par étiquette si aucun produit n'a été mis en avant.
  const [featured, setFeatured] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;

    apiFetch<Product[]>('/products/featured?limit=4')
      .then((data) => {
        if (!cancelled) setFeatured(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setFeatured([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const t = {
    fr: {
      heroEyebrow: "Boutique médicale — paiement à la livraison",
      heroTitle: "Le matériel médical livré chez vous, sans compte, sans avance.",
      heroSub: "Diagnostic, mobilité, urgence — commandez en quelques clics, payez seulement à la réception. Cliniques : demandez un devis pour vos commandes groupées.",
      heroCta1: "Voir la boutique",
      heroCta2: "Demander un devis clinique",
      heroCardTitle: "Simulateur rapide",
      heroCardZone: "Zone de livraison",
      heroCardDelay: "Délai estimé",
      heroCardFee: "Frais de livraison",
      featured: "Produits vedettes",
      featuredLink: "Voir tout le catalogue",
      trustTitle: "Pourquoi commander sur Mediquipe",
      t1t: "Paiement à la livraison", t1p: "Vous payez uniquement quand le colis est entre vos mains.",
      t2t: "Confirmation avant expédition", t2p: "Un SMS ou appel de confirmation avant chaque envoi.",
      t3t: "Retour sous 48h", t3p: "Article défectueux ? Signalez-le et on s'en occupe sous 48h.",
      t4t: "Points de fidélité", t4p: "10 commandes honorées = un cadeau ou un bon d'achat.",
    },
    en: {
      heroEyebrow: "Medical shop — cash on delivery",
      heroTitle: "Medical equipment delivered home, no account, no upfront payment.",
      heroSub: "Diagnostics, mobility, emergency — order in a few clicks, pay only on delivery. Clinics: request a quote for bulk orders.",
      heroCta1: "Browse the shop",
      heroCta2: "Request a clinic quote",
      heroCardTitle: "Quick simulator",
      heroCardZone: "Delivery zone",
      heroCardDelay: "Estimated delay",
      heroCardFee: "Delivery fee",
      featured: "Featured products",
      featuredLink: "See full catalog",
      trustTitle: "Why order with Mediquipe",
      t1t: "Cash on delivery", t1p: "You pay only when the package is in your hands.",
      t2t: "Confirmation before shipping", t2p: "An SMS or call confirms every order before it ships.",
      t3t: "48h returns", t3p: "Faulty item? Report it and we handle it within 48h.",
      t4t: "Loyalty points", t4p: "10 completed orders = a gift or a voucher.",
    },
  }[lang];

  // Repli si l'appel dédié échoue : l'accueil ne reste jamais vide.
  const shown =
    featured.length > 0
      ? featured
      : products
          .filter((p) => (p.flags || []).some((f) => ['bestseller', 'promo', 'new'].includes(f)))
          .slice(0, 4);

  return (
    <>
      {/* Campagnes en cours, pilotées depuis le back-office. */}
      <Banner placement="home_hero" />

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="cross"></span> {t.heroEyebrow}
          </div>
          <h1>{t.heroTitle}</h1>
          <p className="sub">{t.heroSub}</p>
          <div className="hero-ctas">
            <Link href="/catalog" className="btn btn-primary">
              {t.heroCta1}
            </Link>
            <Link href="/b2b" className="btn btn-ghost">
              {t.heroCta2}
            </Link>
          </div>
        </div>

        <div className="hero-aside" style={{ color: '#000', minWidth: '320px' }}>
          <MapSimulator />
        </div>
      </section>

      <section className="section">
        <Reveal>
          <div className="section-head">
            <h2>{t.featured}</h2>
            <Link href="/catalog" className="link">
              {t.featuredLink} →
            </Link>
          </div>
        </Reveal>
        {productsError ? (
          <div className="alert alert-error">{productsError}</div>
        ) : productsLoading ? (
          <p style={{ color: 'var(--ink-soft)' }}>
            {lang === 'fr' ? 'Chargement du catalogue…' : 'Loading catalog…'}
          </p>
        ) : (
          <div className="grid-products">
            {shown.map((p, i) => (
              <Reveal key={p.id} delay={i * 60}>
                <ProductCard p={p} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <Reveal>
          <div className="section-head">
            <h2>{t.trustTitle}</h2>
          </div>
        </Reveal>
        <div className="trust">
          {[
            { t: t.t1t, p: t.t1p },
            { t: t.t2t, p: t.t2p },
            { t: t.t3t, p: t.t3p },
            { t: t.t4t, p: t.t4p },
          ].map((item, i) => (
            <Reveal key={item.t} delay={i * 70}>
              <div className="trust-item">
                <span className="cross"></span>
                <div>
                  <h4>{item.t}</h4>
                  <p>{item.p}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
