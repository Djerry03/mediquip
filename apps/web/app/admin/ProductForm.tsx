'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { formatFcfa } from '../context/AppContext';
import { apiFetch, ApiError, API_URL, mediaUrl } from '../lib/api';
import { AdminProduct, PRODUCT_FLAGS, StockLine } from './types';

type Props = {
  /** `null` = création, sinon édition du produit fourni. */
  product: AdminProduct | null;
  categories: { fr: string; en: string }[];
  onClose: () => void;
  onSaved: () => void;
  notify: (message: string) => void;
};

type FormState = {
  id: string;
  nameFr: string;
  nameEn: string;
  catFr: string;
  catEn: string;
  descFr: string;
  descEn: string;
  price: string;
  oldPrice: string;
  delay: string;
  poids: string;
  flags: string[];
  est_fragile: boolean;
  necessite_chaine_froid: boolean;
  livraison_autorisee: boolean;
  necessite_ordonnance: boolean;
  actif: boolean;
};

const EMPTY: FormState = {
  id: '',
  nameFr: '',
  nameEn: '',
  catFr: '',
  catEn: '',
  descFr: '',
  descEn: '',
  price: '',
  oldPrice: '',
  delay: '24-48h',
  poids: '0',
  flags: [],
  est_fragile: false,
  necessite_chaine_froid: false,
  livraison_autorisee: true,
  necessite_ordonnance: false,
  actif: true,
};

/** « Nébuliseur à compression » → « nebuliseur-a-compression ». */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ProductForm({ product, categories, onClose, onSaved, notify }: Props) {
  const isEdit = product !== null;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [images, setImages] = useState<string[]>([]);
  const [stock, setStock] = useState<StockLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // L'identifiant se déduit du nom tant que l'administrateur n'y touche pas.
  const [idTouched, setIdTouched] = useState(false);

  useEffect(() => {
    if (!product) {
      setForm(EMPTY);
      setImages([]);
      setStock([]);
      setIdTouched(false);
      return;
    }

    setForm({
      id: product.id,
      nameFr: product.name.fr,
      nameEn: product.name.en,
      catFr: product.cat.fr,
      catEn: product.cat.en,
      descFr: product.desc.fr,
      descEn: product.desc.en,
      price: String(product.price),
      oldPrice: product.oldPrice ? String(product.oldPrice) : '',
      delay: product.delay,
      poids: String(product.poids_kg ?? 0),
      flags: product.flags ?? [],
      est_fragile: product.est_fragile,
      necessite_chaine_froid: product.necessite_chaine_froid,
      livraison_autorisee: product.livraison_autorisee,
      necessite_ordonnance: product.necessite_ordonnance,
      actif: product.actif,
    });
    setImages(product.images ?? []);
    setIdTouched(true);
  }, [product]);

  const loadStock = useCallback(async () => {
    if (!product) return;
    try {
      setStock(await apiFetch<StockLine[]>(`/products/${product.id}/stock`, { auth: true }));
    } catch {
      setStock([]);
    }
  }, [product]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleFlag = (flag: string) =>
    setForm((prev) => ({
      ...prev,
      flags: prev.flags.includes(flag)
        ? prev.flags.filter((f) => f !== flag)
        : [...prev.flags, flag],
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const price = Number(form.price);
    const oldPrice = form.oldPrice ? Number(form.oldPrice) : undefined;

    if (!Number.isFinite(price) || price < 0) return setError('Prix invalide.');
    if (oldPrice !== undefined && oldPrice <= price) {
      return setError('Le prix barré doit être supérieur au prix actuel.');
    }

    const payload = {
      cat: { fr: form.catFr.trim(), en: (form.catEn || form.catFr).trim() },
      name: { fr: form.nameFr.trim(), en: (form.nameEn || form.nameFr).trim() },
      desc: { fr: form.descFr.trim(), en: (form.descEn || form.descFr).trim() },
      price: Math.round(price),
      oldPrice: oldPrice ? Math.round(oldPrice) : 0,
      flags: form.flags,
      delay: form.delay.trim(),
      poids_kg: Number(form.poids) || 0,
      est_fragile: form.est_fragile,
      necessite_chaine_froid: form.necessite_chaine_froid,
      livraison_autorisee: form.livraison_autorisee,
      necessite_ordonnance: form.necessite_ordonnance,
      actif: form.actif,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await apiFetch(`/products/${product!.id}`, {
          method: 'PATCH',
          auth: true,
          body: JSON.stringify(payload),
        });
        notify(`« ${payload.name.fr} » mis à jour.`);
      } else {
        await apiFetch('/products', {
          method: 'POST',
          auth: true,
          body: JSON.stringify({ ...payload, id: form.id.trim(), images: [] }),
        });
        notify(`« ${payload.name.fr} » créé.`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Le téléversement passe par `fetch` brut : `FormData` doit poser
   * lui-même son Content-Type avec la frontière multipart.
   */
  const uploadImage = async (file: File) => {
    if (!product) return;
    setUploading(true);
    setError(null);

    const body = new FormData();
    body.append('file', file);

    try {
      const res = await fetch(`${API_URL}/products/${product.id}/images`, {
        method: 'POST',
        credentials: 'include',
        body,
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new ApiError(payload?.message || `Erreur ${res.status}`, res.status);

      setImages(payload.images ?? []);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Téléversement impossible.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeImage = async (url: string) => {
    if (!product) return;
    try {
      const updated = await apiFetch<AdminProduct>(
        `/products/${product.id}/images?url=${encodeURIComponent(url)}`,
        { method: 'DELETE', auth: true },
      );
      setImages(updated.images ?? []);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Suppression impossible.');
    }
  };

  const makeCover = async (url: string) => {
    if (!product) return;
    const reordered = [url, ...images.filter((i) => i !== url)];
    try {
      const updated = await apiFetch<AdminProduct>(`/products/${product.id}/images/order`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ images: reordered }),
      });
      setImages(updated.images ?? []);
      onSaved();
      notify('Vignette mise à jour.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Réordonnancement impossible.');
    }
  };

  const saveStock = async (boutiqueId: string, quantite: number) => {
    if (!product) return;
    try {
      await apiFetch(`/products/${product.id}/stock`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ boutique_id: boutiqueId, quantite }),
      });
      notify('Stock mis à jour.');
      loadStock();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ajustement impossible.');
    }
  };

  const margin =
    form.oldPrice && Number(form.oldPrice) > Number(form.price)
      ? Math.round(
          ((Number(form.oldPrice) - Number(form.price)) / Number(form.oldPrice)) * 100,
        )
      : null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Modifier le produit' : 'Nouveau produit'}
      >
        <div className="modal-head">
          <h2>{isEdit ? `Modifier « ${product!.name.fr} »` : 'Nouveau produit'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <form className="modal-body" onSubmit={submit}>
          <fieldset className="form-section">
            <legend>Identité</legend>

            <div className="form-grid">
              <label>
                Nom (français)
                <input
                  required
                  value={form.nameFr}
                  onChange={(e) => {
                    set('nameFr', e.target.value);
                    if (!isEdit && !idTouched) set('id', slugify(e.target.value));
                  }}
                />
              </label>

              <label>
                Nom (anglais)
                <input
                  value={form.nameEn}
                  placeholder="Repris du français si vide"
                  onChange={(e) => set('nameEn', e.target.value)}
                />
              </label>
            </div>

            <label>
              Identifiant technique
              <input
                required
                disabled={isEdit}
                pattern="[a-z0-9-]+"
                value={form.id}
                onChange={(e) => {
                  setIdTouched(true);
                  set('id', e.target.value);
                }}
              />
              <small>
                {isEdit
                  ? "Non modifiable : les commandes passées y font référence."
                  : 'Minuscules, chiffres et tirets. Sert aussi d’adresse de la fiche produit.'}
              </small>
            </label>

            <div className="form-grid">
              <label>
                Catégorie (français)
                <input
                  required
                  list="categories-fr"
                  value={form.catFr}
                  onChange={(e) => {
                    const match = categories.find((c) => c.fr === e.target.value);
                    set('catFr', e.target.value);
                    if (match) set('catEn', match.en);
                  }}
                />
                <datalist id="categories-fr">
                  {categories.map((c) => (
                    <option key={c.fr} value={c.fr} />
                  ))}
                </datalist>
              </label>

              <label>
                Catégorie (anglais)
                <input
                  value={form.catEn}
                  placeholder="Repris du français si vide"
                  onChange={(e) => set('catEn', e.target.value)}
                />
              </label>
            </div>

            <label>
              Description (français)
              <textarea
                required
                rows={3}
                value={form.descFr}
                onChange={(e) => set('descFr', e.target.value)}
              />
            </label>

            <label>
              Description (anglais)
              <textarea
                rows={3}
                placeholder="Reprise du français si vide"
                value={form.descEn}
                onChange={(e) => set('descEn', e.target.value)}
              />
            </label>
          </fieldset>

          <fieldset className="form-section">
            <legend>Prix et disponibilité</legend>

            <div className="form-grid">
              <label>
                Prix de vente (FCFA)
                <input
                  type="number"
                  min={0}
                  required
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                />
              </label>

              <label>
                Prix barré (facultatif)
                <input
                  type="number"
                  min={0}
                  value={form.oldPrice}
                  onChange={(e) => set('oldPrice', e.target.value)}
                />
                <small>
                  {margin !== null
                    ? `Affiché comme −${margin} % : ${formatFcfa(Number(form.oldPrice))} barré.`
                    : 'Laissez vide si le produit n’est pas en promotion.'}
                </small>
              </label>
            </div>

            <div className="form-grid">
              <label>
                Délai annoncé
                <input
                  required
                  placeholder="24-48h"
                  value={form.delay}
                  onChange={(e) => set('delay', e.target.value)}
                />
              </label>

              <label>
                Poids (kg)
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={form.poids}
                  onChange={(e) => set('poids', e.target.value)}
                />
                <small>Sert au calcul des frais de livraison au-delà du forfait inclus.</small>
              </label>
            </div>

            <div className="form-field">
              <span className="form-label">Étiquettes affichées sur la vignette</span>
              <div className="chip-row">
                {PRODUCT_FLAGS.map((flag) => (
                  <button
                    type="button"
                    key={flag.value}
                    className={`chip ${form.flags.includes(flag.value) ? 'on' : ''}`}
                    onClick={() => toggleFlag(flag.value)}
                  >
                    {flag.fr}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Contraintes logistiques</legend>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={form.est_fragile}
                onChange={(e) => set('est_fragile', e.target.checked)}
              />
              <span>
                <strong>Fragile</strong>
                <small>Ajoute le supplément « matériel fragile » aux frais de livraison.</small>
              </span>
            </label>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={form.necessite_chaine_froid}
                onChange={(e) => set('necessite_chaine_froid', e.target.checked)}
              />
              <span>
                <strong>Chaîne du froid</strong>
                <small>
                  Ne peut être expédié que depuis une boutique équipée, avec supplément.
                </small>
              </span>
            </label>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={!form.livraison_autorisee}
                onChange={(e) => set('livraison_autorisee', !e.target.checked)}
              />
              <span>
                <strong>Retrait en boutique obligatoire</strong>
                <small>
                  Le produit ne peut pas être livré : toute commande le contenant bascule en retrait.
                </small>
              </span>
            </label>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={form.necessite_ordonnance}
                onChange={(e) => set('necessite_ordonnance', e.target.checked)}
              />
              <span>
                <strong>Soumis à ordonnance</strong>
                <small>
                  La commande ne peut pas être confirmée avant vérification de l’ordonnance.
                </small>
              </span>
            </label>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={form.actif}
                onChange={(e) => set('actif', e.target.checked)}
              />
              <span>
                <strong>Visible dans le catalogue</strong>
                <small>Décochez pour retirer le produit de la vente sans le supprimer.</small>
              </span>
            </label>
          </fieldset>

          {isEdit && (
            <>
              <fieldset className="form-section">
                <legend>Visuels</legend>

                {images.length === 0 ? (
                  <p className="cart-line-meta">
                    Aucun visuel. La vignette affichera un symbole générique.
                  </p>
                ) : (
                  <div className="image-grid">
                    {images.map((url, index) => (
                      <div className={`image-tile ${index === 0 ? 'cover' : ''}`} key={url}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mediaUrl(url)} alt="" />
                        {index === 0 && <span className="image-badge">Vignette</span>}
                        <div className="image-actions">
                          {index !== 0 && (
                            <button type="button" onClick={() => makeCover(url)}>
                              En vignette
                            </button>
                          )}
                          <button type="button" className="danger" onClick={() => removeImage(url)}>
                            Retirer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={uploading || images.length >= 6}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? 'Envoi…' : '＋ Ajouter un visuel'}
                </button>
                <small style={{ color: 'var(--ink-soft)' }}>
                  JPEG, PNG, WebP ou GIF — 5 Mo maximum, 6 visuels par produit. Le premier sert de
                  vignette au catalogue.
                </small>
              </fieldset>

              <fieldset className="form-section">
                <legend>Stock par boutique</legend>

                {stock.map((line) => (
                  <div className="stock-row" key={line.boutique_id}>
                    <span>
                      {line.boutique_nom}
                      {line.gere_chaine_froid && <span className="badge">❄️ froid</span>}
                    </span>
                    <input
                      type="number"
                      min={0}
                      defaultValue={line.quantite}
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (value !== line.quantite) saveStock(line.boutique_id, value);
                      }}
                    />
                  </div>
                ))}
                <small style={{ color: 'var(--ink-soft)' }}>
                  Chaque correction est journalisée dans l’historique des mouvements de stock.
                </small>
              </fieldset>
            </>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button className="btn btn-dark" disabled={saving}>
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le produit'}
            </button>
          </div>

          {!isEdit && (
            <p className="cart-note">
              Les visuels et le stock se règlent après la création, en rouvrant la fiche.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
