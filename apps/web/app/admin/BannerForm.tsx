'use client';

import React, { useState } from 'react';
import { apiFetch, ApiError } from '../lib/api';
import { Banner, BANNER_PLACEMENTS, BannerPlacement } from './types';

type Props = {
  banner: Banner | null;
  onClose: () => void;
  onSaved: () => void;
  notify: (message: string) => void;
};

/** ISO → `2026-09-30T14:30`, format attendu par `<input type="datetime-local">`. */
function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BannerForm({ banner, onClose, onSaved, notify }: Props) {
  const isEdit = banner !== null;

  const [form, setForm] = useState({
    name: banner?.name ?? '',
    placement: (banner?.placement ?? 'top_strip') as BannerPlacement,
    titleFr: banner?.title.fr ?? '',
    titleEn: banner?.title.en ?? '',
    subtitleFr: banner?.subtitle?.fr ?? '',
    subtitleEn: banner?.subtitle?.en ?? '',
    ctaLabelFr: banner?.ctaLabel?.fr ?? '',
    ctaLabelEn: banner?.ctaLabel?.en ?? '',
    ctaUrl: banner?.ctaUrl ?? '',
    backgroundColor: banner?.backgroundColor ?? '#00A58C',
    textColor: banner?.textColor ?? '#FFFFFF',
    startsAt: toLocalInput(banner?.startsAt),
    endsAt: toLocalInput(banner?.endsAt),
    priority: String(banner?.priority ?? 0),
    active: banner?.active ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const placement = BANNER_PLACEMENTS.find((p) => p.value === form.placement)!;
  const isStrip = form.placement === 'top_strip';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) {
      return setError('La date de fin doit être postérieure à la date de début.');
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      placement: form.placement,
      title: { fr: form.titleFr.trim(), en: (form.titleEn || form.titleFr).trim() },
      backgroundColor: form.backgroundColor,
      textColor: form.textColor,
      priority: Number(form.priority) || 0,
      active: form.active,
    };

    if (form.subtitleFr) {
      payload.subtitle = {
        fr: form.subtitleFr.trim(),
        en: (form.subtitleEn || form.subtitleFr).trim(),
      };
    }
    if (form.ctaLabelFr && form.ctaUrl) {
      payload.ctaLabel = {
        fr: form.ctaLabelFr.trim(),
        en: (form.ctaLabelEn || form.ctaLabelFr).trim(),
      };
      payload.ctaUrl = form.ctaUrl.trim();
    }
    if (form.startsAt) payload.startsAt = new Date(form.startsAt).toISOString();
    if (form.endsAt) payload.endsAt = new Date(form.endsAt).toISOString();

    setSaving(true);
    try {
      if (isEdit) {
        await apiFetch(`/banners/${banner!.id}`, {
          method: 'PATCH',
          auth: true,
          body: JSON.stringify(payload),
        });
        notify(`Bannière « ${form.name} » mise à jour.`);
      } else {
        await apiFetch('/banners', {
          method: 'POST',
          auth: true,
          body: JSON.stringify(payload),
        });
        notify(`Bannière « ${form.name} » créée.`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  /** Ce que verra le visiteur, rendu avec les mêmes styles que le site public. */
  const preview = isStrip ? (
    <div
      className="preview-strip"
      style={{ background: form.backgroundColor, color: form.textColor }}
    >
      <span className="cross" style={{ width: 11, height: 11 }} />
      {form.titleFr || 'Votre message ici'}
    </div>
  ) : (
    <div
      className="preview-hero"
      style={{ background: form.backgroundColor, color: form.textColor }}
    >
      <strong>{form.titleFr || 'Titre de la bannière'}</strong>
      {form.subtitleFr && <span>{form.subtitleFr}</span>}
      {form.ctaLabelFr && form.ctaUrl && (
        <span className="preview-cta" style={{ color: form.backgroundColor }}>
          {form.ctaLabelFr}
        </span>
      )}
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{isEdit ? `Modifier « ${banner!.name} »` : 'Nouvelle bannière'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <form className="modal-body" onSubmit={submit}>
          <div className="form-field">
            <span className="form-label">Aperçu</span>
            {preview}
            <small style={{ color: 'var(--ink-soft)' }}>
              Rendu approximatif dans la langue française. La version anglaise s’affiche pour les
              visiteurs ayant choisi EN.
            </small>
          </div>

          <fieldset className="form-section">
            <legend>Emplacement</legend>

            <label>
              Nom interne
              <input
                required
                placeholder="Campagne rentrée médicale"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
              <small>Visible du seul back-office, pour vous y retrouver.</small>
            </label>

            <label>
              Où l’afficher
              <select
                value={form.placement}
                onChange={(e) => set('placement', e.target.value as BannerPlacement)}
              >
                {BANNER_PLACEMENTS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.fr}
                  </option>
                ))}
              </select>
              <small>{placement.hint}</small>
            </label>
          </fieldset>

          <fieldset className="form-section">
            <legend>Contenu</legend>

            <div className="form-grid">
              <label>
                Message (français)
                <input
                  required
                  maxLength={200}
                  value={form.titleFr}
                  onChange={(e) => set('titleFr', e.target.value)}
                />
              </label>

              <label>
                Message (anglais)
                <input
                  maxLength={200}
                  placeholder="Repris du français si vide"
                  value={form.titleEn}
                  onChange={(e) => set('titleEn', e.target.value)}
                />
              </label>
            </div>

            {!isStrip && (
              <>
                <div className="form-grid">
                  <label>
                    Sous-titre (français)
                    <input
                      maxLength={200}
                      value={form.subtitleFr}
                      onChange={(e) => set('subtitleFr', e.target.value)}
                    />
                  </label>

                  <label>
                    Sous-titre (anglais)
                    <input
                      maxLength={200}
                      placeholder="Repris du français si vide"
                      value={form.subtitleEn}
                      onChange={(e) => set('subtitleEn', e.target.value)}
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label>
                    Texte du bouton
                    <input
                      maxLength={60}
                      placeholder="Voir les promotions"
                      value={form.ctaLabelFr}
                      onChange={(e) => set('ctaLabelFr', e.target.value)}
                    />
                  </label>

                  <label>
                    Lien du bouton
                    <input
                      placeholder="/catalog"
                      value={form.ctaUrl}
                      onChange={(e) => set('ctaUrl', e.target.value)}
                    />
                    <small>Page du site (/catalog) ou adresse complète (https://…).</small>
                  </label>
                </div>
              </>
            )}

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
            <legend>Programmation</legend>

            <div className="form-grid">
              <label>
                Début de diffusion
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => set('startsAt', e.target.value)}
                />
                <small>Vide = diffusée dès activation.</small>
              </label>

              <label>
                Fin de diffusion
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => set('endsAt', e.target.value)}
                />
                <small>Vide = jusqu’à désactivation manuelle.</small>
              </label>
            </div>

            <label>
              Priorité
              <input
                type="number"
                min={0}
                max={1000}
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
              />
              <small>
                À emplacement égal, la valeur la plus élevée s’affiche en premier.
              </small>
            </label>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set('active', e.target.checked)}
              />
              <span>
                <strong>Bannière active</strong>
                <small>
                  Interrupteur immédiat, indépendant des dates : décochez pour retirer la bannière
                  du site sans perdre son contenu.
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
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer la bannière'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
