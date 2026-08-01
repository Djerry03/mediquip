'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatFcfa, useApp } from '../context/AppContext';
import { useBanners } from './Banner';

export default function Navbar() {
  const pathname = usePathname();
  const { lang, setLang, cartCount, deliveryRules } = useApp();
  const campaigns = useBanners('top_strip');
  const headerRef = useRef<HTMLElement>(null);
  const prevCount = useRef(cartCount);
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const onScroll = () => {
      headerRef.current?.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (cartCount > prevCount.current && badgeRef.current) {
      badgeRef.current.classList.remove('pop');
      void badgeRef.current.offsetWidth;
      badgeRef.current.classList.add('pop');
    }
    prevCount.current = cartCount;
  }, [cartCount]);

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
      {/*
        Une campagne en cours prend la place des messages permanents : c'est
        le levier marketing du bandeau. Sans campagne, on retombe sur les
        arguments de vente par défaut.
      */}
      {campaigns.length > 0 ? (
        <div
          className="strip strip-campaign"
          style={{
            background: campaigns[0].backgroundColor || undefined,
            color: campaigns[0].textColor || undefined,
          }}
        >
          {campaigns.map((banner) => {
            const content = (
              <>
                <span className="cross" style={{ width: 11, height: 11 }}></span>
                {banner.title[lang]}
              </>
            );
            return banner.ctaUrl ? (
              <Link key={banner.id} href={banner.ctaUrl as any} className="strip-link">
                {content}
              </Link>
            ) : (
              <span key={banner.id}>{content}</span>
            );
          })}
        </div>
      ) : (
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
      )}

      <header className="site" ref={headerRef}>
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
              {cartCount > 0 && (
                <span className="badge-count" ref={badgeRef}>
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
