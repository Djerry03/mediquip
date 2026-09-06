'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '../context/AppContext';
import { apiFetch, mediaUrl } from '../lib/api';

export type PublicBanner = {
  id: string;
  placement: string;
  title: { fr: string; en: string };
  subtitle?: { fr: string; en: string };
  ctaLabel?: { fr: string; en: string };
  ctaUrl?: string;
  imageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
};

/**
 * Charge les bannières d'un emplacement.
 *
 * Une bannière absente n'est pas une erreur : le site fonctionne sans, et
 * chaque emplacement prévoit son propre repli. On ne signale donc rien au
 * visiteur si l'appel échoue.
 */
export function useBanners(placement: string): PublicBanner[] {
  const [banners, setBanners] = useState<PublicBanner[]>([]);

  useEffect(() => {
    let cancelled = false;

    apiFetch<PublicBanner[]>(`/banners?placement=${placement}`)
      .then((data) => {
        if (!cancelled) setBanners(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setBanners([]);
      });

    return () => {
      cancelled = true;
    };
  }, [placement]);

  return banners;
}

/** Encart de campagne : accueil, catalogue ou panier. */
export default function Banner({ placement }: { placement: string }) {
  const { lang } = useApp();
  const banners = useBanners(placement);

  if (banners.length === 0) return null;

  return (
    <>
      {banners.map((b) => {
        const content = (
          <>
            <div className="campaign-text">
              <strong>{b.title[lang]}</strong>
              {b.subtitle && <span>{b.subtitle[lang]}</span>}
            </div>
            {b.ctaLabel && b.ctaUrl && (
              <span
                className="campaign-cta"
                style={{ background: b.textColor || '#fff', color: b.backgroundColor || '#00A58C' }}
              >
                {b.ctaLabel[lang]}
              </span>
            )}
          </>
        );

        const style = {
          background: b.backgroundColor || 'var(--forest)',
          color: b.textColor || '#fff',
          backgroundImage: b.imageUrl ? `url(${mediaUrl(b.imageUrl)})` : undefined,
        };

        // Un lien absolu sort du site : il s'ouvre dans un nouvel onglet et
        // `noreferrer` évite de transmettre l'origine à la destination.
        if (b.ctaUrl?.startsWith('http')) {
          return (
            <a
              key={b.id}
              className="campaign-banner"
              style={style}
              href={b.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {content}
            </a>
          );
        }

        return b.ctaUrl ? (
          <Link key={b.id} className="campaign-banner" style={style} href={b.ctaUrl as any}>
            {content}
          </Link>
        ) : (
          <div key={b.id} className="campaign-banner" style={style}>
            {content}
          </div>
        );
      })}
    </>
  );
}
