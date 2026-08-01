'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useApp } from './context/AppContext';
import ProductCard from './components/ProductCard';

const MapSimulator = dynamic(() => import('./components/MapSimulator'), { ssr: false });

export default function HomePage() {
  const { lang, products, productsLoading, productsError } = useApp();

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

  const featured = products
    .filter((p) => (p.flags || []).some((f) => ['bestseller', 'promo', 'new'].includes(f)))
    .slice(0, 4);

  return (
    <>
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

        <div style={{ color: '#000', minWidth: '320px' }}>
          <MapSimulator />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{t.featured}</h2>
          <Link href="/catalog" className="link">
            {t.featuredLink} →
          </Link>
        </div>
        {productsError ? (
          <div className="alert alert-error">{productsError}</div>
        ) : productsLoading ? (
          <p style={{ color: 'var(--ink-soft)' }}>
            {lang === 'fr' ? 'Chargement du catalogue…' : 'Loading catalog…'}
          </p>
        ) : (
          <div className="grid-products">
            {featured.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{t.trustTitle}</h2>
        </div>
        <div className="trust">
          <div className="trust-item">
            <span className="cross"></span>
            <div>
              <h4>{t.t1t}</h4>
              <p>{t.t1p}</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="cross"></span>
            <div>
              <h4>{t.t2t}</h4>
              <p>{t.t2p}</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="cross"></span>
            <div>
              <h4>{t.t3t}</h4>
              <p>{t.t3p}</p>
            </div>
          </div>
          <div className="trust-item">
            <span className="cross"></span>
            <div>
              <h4>{t.t4t}</h4>
              <p>{t.t4p}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
