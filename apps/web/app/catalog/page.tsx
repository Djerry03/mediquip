'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import Banner from '../components/Banner';

const PACK_CATEGORY_KEYS = ['Packs médicaux', 'Medical packs'];

export default function CatalogPage() {
  const { lang, products, productsLoading, productsError, reloadProducts } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('pop');

  const t = {
    fr: {
      catalogTitle: 'Catalogue',
      searchPh: 'Rechercher un produit…',
      allCats: 'Toutes catégories',
      sortPop: 'Popularité',
      sortPriceAsc: 'Prix croissant',
      sortPriceDesc: 'Prix décroissant',
      loading: 'Chargement du catalogue…',
      empty: 'Aucun produit ne correspond à votre recherche.',
      retry: 'Réessayer',
    },
    en: {
      catalogTitle: 'Catalog',
      searchPh: 'Search a product…',
      allCats: 'All categories',
      sortPop: 'Popularity',
      sortPriceAsc: 'Price: low to high',
      sortPriceDesc: 'Price: high to low',
      loading: 'Loading catalog…',
      empty: 'No product matches your search.',
      retry: 'Retry',
    },
  }[lang];

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.cat?.[lang]).filter(Boolean))) as string[],
    [products, lang],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matches = products.filter((p) => {
      const name = p.name?.[lang] || '';
      const desc = p.desc?.[lang] || '';
      const cat = p.cat?.[lang] || '';

      const matchQuery =
        !needle || name.toLowerCase().includes(needle) || desc.toLowerCase().includes(needle);

      // Les packs ont leur page dédiée : on les masque du catalogue général,
      // sauf si l'utilisateur choisit explicitement leur catégorie.
      const matchCategory =
        category === 'all' ? !PACK_CATEGORY_KEYS.includes(cat) : cat === category;

      return matchQuery && matchCategory;
    });

    switch (sort) {
      case 'priceAsc':
        return [...matches].sort((a, b) => a.price - b.price);
      case 'priceDesc':
        return [...matches].sort((a, b) => b.price - a.price);
      default:
        return [...matches].sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
    }
  }, [products, lang, query, category, sort]);

  return (
    <>
      <div className="page-header">
        <h1>{t.catalogTitle}</h1>
      </div>

      <Banner placement="catalog_top" />

      <div className="filters">
        <div className="search-box">
          🔎{' '}
          <input
            type="search"
            placeholder={t.searchPh}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t.searchPh}
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={t.allCats}
        >
          <option value="all">{t.allCats}</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t.sortPop}>
          <option value="pop">{t.sortPop}</option>
          <option value="priceAsc">{t.sortPriceAsc}</option>
          <option value="priceDesc">{t.sortPriceDesc}</option>
        </select>
      </div>

      {productsError ? (
        <div className="alert alert-error">
          <p>{productsError}</p>
          <button className="btn btn-ghost" onClick={() => reloadProducts()}>
            {t.retry}
          </button>
        </div>
      ) : productsLoading ? (
        <p style={{ color: 'var(--ink-soft)' }}>{t.loading}</p>
      ) : (
        <div className="grid-products">
          {filtered.length > 0 ? (
            filtered.map((p, i) => (
              <Reveal key={p.id} delay={(i % 8) * 50}>
                <ProductCard p={p} />
              </Reveal>
            ))
          ) : (
            <p style={{ gridColumn: '1/-1', color: 'var(--ink-soft)' }}>{t.empty}</p>
          )}
        </div>
      )}
    </>
  );
}
