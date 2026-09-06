'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatFcfa } from '../context/AppContext';
import { apiFetch, ApiError, mediaUrl } from '../lib/api';
import { AdminProduct } from './types';

type Localized = { fr: string; en: string };

type CampaignPage = {
  id: string;
  slug: string;
  name: string;
  title: Localized;
  subtitle?: Localized;
  paragraphs: Localized[];
  seoDescription?: Localized;
  productIds: string[];
  promotionCode?: string;
  backgroundColor?: string;
  textColor?: string;
  published: boolean;
  startsAt?: string;
  endsAt?: string;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3004';

function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CampaignPagePanel({ notify }: { notify: (m: string) => void }) {
  const [pages, setPages] = useState<CampaignPage[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CampaignPage | null | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, catalogue] = await Promise.all([
        apiFetch<CampaignPage[]>('/campaign-pages/admin', { auth: true }),
        apiFetch<AdminProduct[]>('/products/admin', { auth: true }),
      ]);
      setPages(list);
      setProducts(catalogue.filter((p) => p.actif));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      notify(message);
      load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erreur');
    }
  };

  const status = (p: CampaignPage): { label: string; tone: string } => {
    if (!p.published) return { label: 'Brouillon', tone: 'off' };
    const now = Date.now();
    if (p.startsAt && new Date(p.startsAt).getTime() > now) {
      return { label: `Programmée — ${new Date(p.startsAt).toLocaleString('fr-FR')}`, tone: 'scheduled' };
    }
    if (p.endsAt && new Date(p.endsAt).getTime() < now) return { label: 'Terminée', tone: 'off' };
    return { label: 'En ligne', tone: 'live' };
  };

  return (
    <>
      <div className="alert alert-info">
        Chaque page est publiée à l’adresse <code>/promo/&lt;adresse&gt;</code>. Elle est indexable
        par les moteurs tant qu’elle est diffusée, et disparaît d’elle-même à sa date de fin.
      </div>

      <div className="filters">
        <button className="btn btn-dark" onClick={() => setEditing(null)}>
          ＋ Nouvelle page de campagne
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Chargement…</p>
      ) : pages.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)' }}>Aucune page de campagne.</p>
      ) : (
        <div className="banner-list">
          {pages.map((p) => {
            const s = status(p);
            return (
              <div className={`banner-card tone-${s.tone}`} key={p.id}>
                <div className="banner-card-head">
                  <strong>{p.name}</strong>
                  <span className={`status-pill banner-${s.tone}`}>{s.label}</span>
                  <code className="cart-line-meta">/promo/{p.slug}</code>
                  {p.promotionCode && <span className="badge">code {p.promotionCode}</span>}
                </div>

                <div
                  className="preview-hero"
                  style={{
                    background: p.backgroundColor || 'var(--forest)',
                    color: p.textColor || '#fff',
                  }}
                >
                  <strong>{p.title.fr}</strong>
                  {p.subtitle && <span>{p.subtitle.fr}</span>}
                </div>

                <span className="cart-line-meta">
                  {p.productIds.length} produit(s) ·{' '}
                  {p.startsAt ? `du ${new Date(p.startsAt).toLocaleString('fr-FR')}` : 'sans début'}
                  {' · '}
                  {p.endsAt ? `au ${new Date(p.endsAt).toLocaleString('fr-FR')}` : 'sans fin'}
                </span>

                <div className="order-card-foot">
                  <button className="link" onClick={() => setEditing(p)}>
                    Modifier
                  </button>
                  <button
                    className="link"
                    onClick={() =>
                      act(
                        () =>
                          apiFetch(`/campaign-pages/${p.id}/toggle`, {
                            method: 'PATCH',
                            auth: true,
                          }),
                        p.published ? 'Page dépubliée.' : 'Page publiée.',
                      )
                    }
                  >
                    {p.published ? 'Dépublier' : 'Publier'}
                  </button>
                  {p.published && (
                    <a
                      className="link"
                      href={`${SITE_URL}/promo/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Voir la page →
                    </a>
                  )}
                  <button
                    className="link-danger"
                    onClick={() => {
                      if (confirm(`Supprimer la page « ${p.name} » ?`)) {
                        act(
                          () =>
                            apiFetch(`/campaign-pages/${p.id}`, { method: 'DELETE', auth: true }),
                          'Page supprimée.',
                        );
                      }
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing !== undefined && (
        <CampaignPageForm
          page={editing}
          products={products}
          onClose={() => setEditing(undefined)}
          onSaved={load}
          notify={notify}
        />
      )}
    </>
  );
}

function CampaignPageForm({
  page,
  products,
  onClose,
  onSaved,
  notify,
}: {
  page: CampaignPage | null;
  products: AdminProduct[];
  onClose: () => void;
  onSaved: () => void;
  notify: (m: string) => void;
}) {
  const isEdit = page !== null;

  const [form, setForm] = useState({
    slug: page?.slug ?? '',
    name: page?.name ?? '',
    titleFr: page?.title.fr ?? '',
    titleEn: page?.title.en ?? '',
    subtitleFr: page?.subtitle?.fr ?? '',
    subtitleEn: page?.subtitle?.en ?? '',
    seoFr: page?.seoDescription?.fr ?? '',
    seoEn: page?.seoDescription?.en ?? '',
    promotionCode: page?.promotionCode ?? '',
    backgroundColor: page?.backgroundColor ?? '#AD185C',
    textColor: page?.textColor ?? '#FFFFFF',
    startsAt: toLocalInput(page?.startsAt),
    endsAt: toLocalInput(page?.endsAt),
    published: page?.published ?? false,
  });

  const [paragraphs, setParagraphs] = useState<Localized[]>(page?.paragraphs ?? []);
  const [selected, setSelected] = useState<string[]>(page?.productIds ?? []);
  const [search, setSearch] = useState('');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const available = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products
      .filter((p) => !selected.includes(p.id))
      .filter((p) => !needle || p.name.fr.toLowerCase().includes(needle) || p.id.includes(needle));
  }, [products, selected, search]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      title: { fr: form.titleFr.trim(), en: (form.titleEn || form.titleFr).trim() },
      paragraphs: paragraphs
        .filter((p) => p.fr.trim())
        .map((p) => ({ fr: p.fr.trim(), en: (p.en || p.fr).trim() })),
      productIds: selected,
      backgroundColor: form.backgroundColor,
      textColor: form.textColor,
      published: form.published,
    };

    if (form.subtitleFr) {
      payload.subtitle = {
        fr: form.subtitleFr.trim(),
        en: (form.subtitleEn || form.subtitleFr).trim(),
      };
    }
    if (form.seoFr) {
      payload.seoDescription = { fr: form.seoFr.trim(), en: (form.seoEn || form.seoFr).trim() };
    }
    if (form.promotionCode) payload.promotionCode = form.promotionCode.trim().toUpperCase();
    if (form.startsAt) payload.startsAt = new Date(form.startsAt).toISOString();
    if (form.endsAt) payload.endsAt = new Date(form.endsAt).toISOString();

    setSaving(true);
    try {
      if (isEdit) {
        await apiFetch(`/campaign-pages/${page!.id}`, {
          method: 'PATCH',
          auth: true,
          body: JSON.stringify(payload),
        });
        notify('Page mise à jour.');
      } else {
        await apiFetch('/campaign-pages', {
          method: 'POST',
          auth: true,
          body: JSON.stringify({ ...payload, slug: form.slug.trim() }),
        });
        notify('Page créée.');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{isEdit ? `Modifier « ${page!.name} »` : 'Nouvelle page de campagne'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <form className="modal-body" onSubmit={submit}>
          <div className="form-field">
            <span className="form-label">Aperçu de l’en-tête</span>
            <div
              className="preview-hero"
              style={{ background: form.backgroundColor, color: form.textColor }}
            >
              <strong>{form.titleFr || 'Titre de la campagne'}</strong>
              {form.subtitleFr && <span>{form.subtitleFr}</span>}
              {form.promotionCode && (
                <span className="preview-cta" style={{ color: form.backgroundColor }}>
                  {form.promotionCode}
                </span>
              )}
            </div>
          </div>

          <fieldset className="form-section">
            <legend>Adresse et identification</legend>

            <label>
              Nom interne
              <input
                required
                placeholder="Campagne rentrée 2026"
                value={form.name}
                onChange={(e) => {
                  set('name', e.target.value);
                  if (!isEdit && !slugTouched) set('slug', slugify(e.target.value));
                }}
              />
            </label>

            <label>
              Adresse de la page
              <input
                required
                disabled={isEdit}
                pattern="[a-z0-9-]+"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set('slug', e.target.value);
                }}
              />
              <small>
                {isEdit
                  ? 'Non modifiable : des liens externes pointent peut-être déjà dessus.'
                  : `La page sera publiée sur ${SITE_URL}/promo/${form.slug || '…'}`}
              </small>
            </label>
          </fieldset>

          <fieldset className="form-section">
            <legend>Contenu</legend>

            <div className="form-grid">
              <label>
                Titre (français)
                <input
                  required
                  maxLength={200}
                  value={form.titleFr}
                  onChange={(e) => set('titleFr', e.target.value)}
                />
              </label>
              <label>
                Titre (anglais)
                <input
                  maxLength={200}
                  placeholder="Repris du français si vide"
                  value={form.titleEn}
                  onChange={(e) => set('titleEn', e.target.value)}
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Accroche (français)
                <input
                  maxLength={200}
                  value={form.subtitleFr}
                  onChange={(e) => set('subtitleFr', e.target.value)}
                />
              </label>
              <label>
                Accroche (anglais)
                <input
                  maxLength={200}
                  placeholder="Reprise du français si vide"
                  value={form.subtitleEn}
                  onChange={(e) => set('subtitleEn', e.target.value)}
                />
              </label>
            </div>

            <div className="form-field">
              <span className="form-label">Paragraphes</span>
              {paragraphs.map((p, i) => (
                <div className="paragraph-row" key={i}>
                  <textarea
                    rows={3}
                    placeholder="Texte en français"
                    value={p.fr}
                    onChange={(e) =>
                      setParagraphs(
                        paragraphs.map((q, j) => (j === i ? { ...q, fr: e.target.value } : q)),
                      )
                    }
                  />
                  <textarea
                    rows={3}
                    placeholder="Texte en anglais (repris du français si vide)"
                    value={p.en}
                    onChange={(e) =>
                      setParagraphs(
                        paragraphs.map((q, j) => (j === i ? { ...q, en: e.target.value } : q)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="link-danger"
                    onClick={() => setParagraphs(paragraphs.filter((_, j) => j !== i))}
                  >
                    Retirer
                  </button>
                </div>
              ))}
              {paragraphs.length < 10 && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ width: 'fit-content' }}
                  onClick={() => setParagraphs([...paragraphs, { fr: '', en: '' }])}
                >
                  ＋ Ajouter un paragraphe
                </button>
              )}
            </div>

            <div className="form-grid">
              <label>
                Couleur de fond
                <input
                  type="color"
                  value={form.backgroundColor}
                  onChange={(e) => set('backgroundColor', e.target.value.toUpperCase())}
                />
              </label>
              <label>
                Couleur du texte
                <input
                  type="color"
                  value={form.textColor}
                  onChange={(e) => set('textColor', e.target.value.toUpperCase())}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Produits mis en avant ({selected.length})</legend>

            {selected.length > 0 && (
              <ol className="featured-list">
                {selected.map((id, index) => {
                  const p = byId.get(id);
                  if (!p) return null;
                  return (
                    <li key={id}>
                      <span className="featured-rank">{index + 1}</span>
                      <div className="thumb">
                        {p.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl(p.images[0])} alt="" />
                        ) : (
                          <span>✚</span>
                        )}
                      </div>
                      <div className="featured-info">
                        <strong>{p.name.fr}</strong>
                        <span className="cart-line-meta">{formatFcfa(p.price)}</span>
                      </div>
                      <div className="featured-actions">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => {
                            const next = [...selected];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            setSelected(next);
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => setSelected(selected.filter((s) => s !== id))}
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="search-box">
              🔎
              <input
                type="search"
                placeholder="Chercher un produit…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <ul className="featured-list available compact">
              {available.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <div className="featured-info">
                    <strong>{p.name.fr}</strong>
                    <span className="cart-line-meta">{formatFcfa(p.price)}</span>
                  </div>
                  <div className="featured-actions">
                    <button
                      type="button"
                      disabled={selected.length >= 24}
                      onClick={() => setSelected([...selected, p.id])}
                    >
                      ＋
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </fieldset>

          <fieldset className="form-section">
            <legend>Code promo et référencement</legend>

            <label>
              Code promo rappelé sur la page
              <input
                maxLength={32}
                placeholder="RENTREE10"
                value={form.promotionCode}
                onChange={(e) => set('promotionCode', e.target.value.toUpperCase())}
              />
              <small>
                Facultatif. Le code doit exister dans l’onglet « Codes promo » pour être accepté au
                panier.
              </small>
            </label>

            <div className="form-grid">
              <label>
                Description moteurs (français)
                <textarea
                  rows={2}
                  maxLength={200}
                  value={form.seoFr}
                  onChange={(e) => set('seoFr', e.target.value)}
                />
                <small>155 caractères environ, affichés dans les résultats de recherche.</small>
              </label>
              <label>
                Description moteurs (anglais)
                <textarea
                  rows={2}
                  maxLength={200}
                  placeholder="Reprise du français si vide"
                  value={form.seoEn}
                  onChange={(e) => set('seoEn', e.target.value)}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Publication</legend>

            <div className="form-grid">
              <label>
                Début de diffusion
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => set('startsAt', e.target.value)}
                />
                <small>Vide = en ligne dès publication.</small>
              </label>
              <label>
                Fin de diffusion
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => set('endsAt', e.target.value)}
                />
                <small>Vide = jusqu’à dépublication manuelle.</small>
              </label>
            </div>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => set('published', e.target.checked)}
              />
              <span>
                <strong>Page publiée</strong>
                <small>
                  Tant que la case est décochée, la page renvoie une erreur 404 aux visiteurs.
                </small>
              </span>
            </label>
          </fieldset>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button className="btn btn-dark" disabled={saving}>
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer la page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
