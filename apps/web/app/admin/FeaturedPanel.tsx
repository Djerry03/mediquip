'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatFcfa } from '../context/AppContext';
import { apiFetch, ApiError, mediaUrl } from '../lib/api';
import { AdminProduct } from './types';

const MAX_FEATURED = 12;

export default function FeaturedPanel({ notify }: { notify: (m: string) => void }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [initial, setInitial] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [all, featured] = await Promise.all([
        apiFetch<AdminProduct[]>('/products/admin', { auth: true }),
        apiFetch<AdminProduct[]>('/products/admin/featured', { auth: true }),
      ]);
      setProducts(all);
      const ids = featured.map((p) => p.id);
      setSelected(ids);
      setInitial(ids);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const available = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products
      .filter((p) => p.actif && !selected.includes(p.id))
      .filter(
        (p) =>
          !needle ||
          p.name.fr.toLowerCase().includes(needle) ||
          p.cat.fr.toLowerCase().includes(needle) ||
          p.id.includes(needle),
      );
  }, [products, selected, search]);

  const dirty = useMemo(
    () => selected.length !== initial.length || selected.some((id, i) => id !== initial[i]),
    [selected, initial],
  );

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;

    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    setSelected(next);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/products/admin/featured', {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ productIds: selected }),
      });
      setInitial(selected);
      notify(
        selected.length === 0
          ? 'Sélection vidée : retour au tri automatique.'
          : `${selected.length} produit(s) mis en avant.`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const thumb = (p: AdminProduct) => (
    <div className="thumb">
      {p.images?.[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(p.images[0])} alt="" />
      ) : (
        <span>✚</span>
      )}
    </div>
  );

  if (loading) return <p style={{ color: 'var(--ink-soft)' }}>Chargement…</p>;

  return (
    <>
      <div className="alert alert-info">
        Les produits choisis ici s’affichent en tête de la page d’accueil, dans cet ordre. Si vous
        ne sélectionnez rien, l’accueil retombe sur un tri automatique par étiquette (promo,
        nouveauté, best-seller).
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="featured-layout">
        <section className="featured-column">
          <h3>
            Sélection ({selected.length}/{MAX_FEATURED})
          </h3>

          {selected.length === 0 ? (
            <p className="cart-line-meta">
              Aucun produit sélectionné — l’accueil utilise le tri automatique.
            </p>
          ) : (
            <ol className="featured-list">
              {selected.map((id, index) => {
                const p = byId.get(id);
                if (!p) return null;
                return (
                  <li key={id}>
                    <span className="featured-rank">{index + 1}</span>
                    {thumb(p)}
                    <div className="featured-info">
                      <strong>{p.name.fr}</strong>
                      <span className="cart-line-meta">
                        {p.cat.fr} · {formatFcfa(p.price)}
                      </span>
                    </div>
                    <div className="featured-actions">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        aria-label="Monter"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === selected.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label="Descendre"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => setSelected(selected.filter((s) => s !== id))}
                        aria-label="Retirer"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="csv-actions">
            <button className="btn btn-dark" disabled={!dirty || saving} onClick={save}>
              {saving ? 'Enregistrement…' : 'Enregistrer la sélection'}
            </button>
            {dirty && (
              <button className="btn btn-ghost" onClick={() => setSelected(initial)}>
                Annuler les modifications
              </button>
            )}
            {selected.length > 0 && (
              <button className="link-danger" onClick={() => setSelected([])}>
                Tout retirer
              </button>
            )}
          </div>
        </section>

        <section className="featured-column">
          <h3>Produits disponibles</h3>

          <div className="search-box">
            🔎
            <input
              type="search"
              placeholder="Nom, catégorie ou identifiant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ul className="featured-list available">
            {available.map((p) => (
              <li key={p.id}>
                {thumb(p)}
                <div className="featured-info">
                  <strong>{p.name.fr}</strong>
                  <span className="cart-line-meta">
                    {p.cat.fr} · {formatFcfa(p.price)}
                  </span>
                </div>
                <div className="featured-actions">
                  <button
                    type="button"
                    disabled={selected.length >= MAX_FEATURED}
                    onClick={() => setSelected([...selected, p.id])}
                  >
                    ＋
                  </button>
                </div>
              </li>
            ))}
            {available.length === 0 && (
              <li className="cart-line-meta" style={{ display: 'block' }}>
                Aucun produit disponible pour cette recherche.
              </li>
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
