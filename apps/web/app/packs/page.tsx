'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';

export default function PacksPage() {
  const { lang, products } = useApp();

  const t = {
    fr: {
      title: 'Packs Médicaux Spéciaux',
      subtitle: 'Équipez-vous au meilleur prix avec nos assortiments de matériel médical et de livres de référence recommandés.',
      noPacks: 'Aucun pack disponible pour le moment.',
    },
    en: {
      title: 'Special Medical Packs',
      subtitle: 'Equip yourself at the best price with our assortments of recommended medical equipment and reference books.',
      noPacks: 'No packs available at the moment.',
    },
  }[lang];

  const medicalPacks = products.filter(
    (p) =>
      p.id.startsWith('pack-') ||
      p.cat?.fr === 'Packs médicaux' ||
      p.cat?.en === 'Medical packs'
  );

  return (
    <>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>{t.title}</h1>
        <p style={{ margin: '8px auto 0', maxWidth: '70ch' }}>{t.subtitle}</p>
      </div>

      <div className="grid-products" style={{ marginTop: '2rem' }}>
        {medicalPacks.length > 0 ? (
          medicalPacks.map((pack) => <ProductCard key={pack.id} p={pack} />)
        ) : (
          <p style={{ gridColumn: '1/-1', color: 'var(--ink-soft)', textAlign: 'center' }}>
            {t.noPacks}
          </p>
        )}
      </div>
    </>
  );
}
