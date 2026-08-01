'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatFcfa, useApp } from '../context/AppContext';

export default function Navbar() {
  const pathname = usePathname();
  const { lang, setLang, cartCount, deliveryRules } = useApp();

  const t = {
    fr: {
      strip1: "Livraison 24–72h selon l'article",
      strip3: 'Paiement à la livraison ou Mobile Money',
      navHome: 'Accueil',
      navShop: 'Boutique',
      navPacks: 'Packs médicaux',
      navUpload: 'Envoyer ma liste',
      navTracking: 'Suivi',
      navB2b: 'Devis groupés',
      navAbout: 'Qui sommes-nous',
      cart: 'Panier',
      account: 'Mon compte',
    },
    en: {
      strip1: 'Delivery in 24–72h depending on item',
      strip3: 'Cash on delivery or Mobile Money',
      navHome: 'Home',
      navShop: 'Shop',
      navPacks: 'Medical packs',
      navUpload: 'Send my list',
      navTracking: 'Track order',
      navB2b: 'Bulk quotes',
      navAbout: 'About us',
      cart: 'Cart',
      account: 'My account',
    },
  }[lang];

  // Le seuil de franco vient de l'API : aucun montant n'est écrit en dur ici.
  const francoLabel =
    deliveryRules && deliveryRules.seuil_franco > 0
      ? lang === 'fr'
        ? `Livraison offerte dès ${formatFcfa(deliveryRules.seuil_franco)}`
        : `Free delivery from ${formatFcfa(deliveryRules.seuil_franco)}`
      : null;

  const navLinks = [
    { href: '/', label: t.navHome },
    { href: '/catalog', label: t.navShop },
    { href: '/packs', label: t.navPacks },
    { href: '/upload-list', label: t.navUpload },
    { href: '/tracking', label: t.navTracking },
    { href: '/b2b', label: t.navB2b },
    { href: '/about', label: t.navAbout },
  ];

  return (
    <>
      <div className="strip">
        <span>
          <span className="cross" style={{ width: 11, height: 11 }}></span>
          {t.strip1}
        </span>
        {francoLabel && (
          <span>
            <span className="cross" style={{ width: 11, height: 11 }}></span>
            {francoLabel}
          </span>
        )}
        <span>
          <span className="cross" style={{ width: 11, height: 11 }}></span>
          {t.strip3}
        </span>
      </div>

      <header className="site">
        <div className="topbar">
          <Link className="logo" href="/">
            <span className="cross"></span> Mediquipe
          </Link>

          <nav className="main">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href as any}
                className={pathname === link.href ? 'active' : ''}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="actions">
            <div className="lang-toggle">
              <button className={lang === 'fr' ? 'active' : ''} onClick={() => setLang('fr')}>
                FR
              </button>
              <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
                EN
              </button>
            </div>

            <Link href={'/account' as any} className="icon-btn">
              👤 <span>{t.account}</span>
            </Link>

            <Link href={"/cart" as any} className="icon-btn">
              🛒 <span>{t.cart}</span>
              {cartCount > 0 && <span className="badge-count">{cartCount}</span>}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
