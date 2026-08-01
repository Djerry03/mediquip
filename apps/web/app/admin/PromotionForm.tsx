'use client';

import React, { useState } from 'react';
import { formatFcfa } from '../context/AppContext';
import { apiFetch, ApiError } from '../lib/api';
import { Promotion, PromotionType } from './types';

type Props = {
  promotion: Promotion | null;
  onClose: () => void;
  onSaved: () => void;
  notify: (message: string) => void;
};

/** `2026-09-30T00:00:00.000Z` → `2026-09-30`, format attendu par `<input type="date">`. */
function toDateInput(iso?: string): string {
  return iso ? iso.slice(0, 10) : '';
}

export default function PromotionForm({ promotion, onClose, onSaved, notify }: Props) {
  const isEdit = promotion !== null;

  const [form, setForm] = useState({
    code: promotion?.code ?? '',
    type: (promotion?.type ?? 'percent') as PromotionType,
    value: String(promotion?.value ?? 10),
    minAmount: String(promotion?.minAmount ?? 0),
    maxDiscount: String(promotion?.maxDiscount ?? 0),
    maxRedemptions: String(promotion?.maxRedemptions ?? 0),
    maxPerCustomer: String(promotion?.maxPerCustomer ?? 1),
    startsAt: toDateInput(promotion?.startsAt),
    expiresAt: toDateInput(promotion?.expiresAt),
    active: promotion?.active ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const value = Number(form.value);
    if (form.type === 'percent' && (value < 1 || value > 100)) {
      return setError('Une remise en pourcentage doit être comprise entre 1 et 100.');
    }
    if (form.type === 'fixed' && value < 1) {
      return setError('Une remise fixe doit être supérieure à 0 FCFA.');
    }

    const payload: Record<string, unknown> = {
      type: form.type,
      value: form.type === 'free_shipping' ? 0 : Math.round(value),
      minAmount: Math.round(Number(form.minAmount) || 0),
      maxDiscount: Math.round(Number(form.maxDiscount) || 0),
      maxRedemptions: Math.round(Number(form.maxRedemptions) || 0),
      maxPerCustomer: Math.round(Number(form.maxPerCustomer) || 0),
      active: form.active,
    };

    // Une date vide signifie « pas de borne » : on n'envoie rien plutôt
    // qu'une chaîne vide, que la validation ISO rejetterait.
    if (form.startsAt) payload.startsAt = new Date(`${form.startsAt}T00:00:00Z`).toISOString();
    if (form.expiresAt) payload.expiresAt = new Date(`${form.expiresAt}T23:59:59Z`).toISOString();

    setSaving(true);
    try {
      if (isEdit) {
        await apiFetch(`/promotions/${promotion!.id}`, {
          method: 'PATCH',
          auth: true,
          body: JSON.stringify(payload),
        });
        notify(`Code ${promotion!.code} mis à jour.`);
      } else {
        await apiFetch('/promotions', {
          method: 'POST',
          auth: true,
          body: JSON.stringify({ ...payload, code: form.code.trim().toUpperCase() }),
        });
        notify(`Code ${form.code.toUpperCase()} créé.`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const example = (() => {
    const panier = 50_000;
    const value = Number(form.value) || 0;
    const max = Number(form.maxDiscount) || 0;

    if (form.type === 'free_shipping') return 'Livraison offerte, quel que soit le montant.';
    if (Number(form.minAmount) > panier) {
      return `Sur un panier de ${formatFcfa(panier)}, ce code ne s’applique pas (minimum ${formatFcfa(Number(form.minAmount))}).`;
    }
    if (form.type === 'fixed') {
      return `Sur un panier de ${formatFcfa(panier)} : remise de ${formatFcfa(Math.min(value, panier))}.`;
    }
    const brut = Math.floor((panier * value) / 100);
    const applique = max > 0 ? Math.min(brut, max) : brut;
    return `Sur un panier de ${formatFcfa(panier)} : remise de ${formatFcfa(applique)}${
      max > 0 && brut > max ? ` (plafonnée à ${formatFcfa(max)})` : ''
    }.`;
  })();

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal modal-narrow" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{isEdit ? `Modifier ${promotion!.code}` : 'Nouveau code promo'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <form className="modal-body" onSubmit={submit}>
          <fieldset className="form-section">
            <legend>Code et remise</legend>

            <label>
              Code saisi par le client
              <input
                required
                disabled={isEdit}
                pattern="[A-Za-z0-9_-]+"
                placeholder="RENTREE10"
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
              />
              {isEdit && <small>Le code n’est pas modifiable : des commandes y font référence.</small>}
            </label>

            <div className="form-grid">
              <label>
                Type de remise
                <select
                  value={form.type}
                  onChange={(e) => set('type', e.target.value as PromotionType)}
                >
                  <option value="percent">Pourcentage</option>
                  <option value="fixed">Montant fixe</option>
                  <option value="free_shipping">Livraison offerte</option>
                </select>
              </label>

              {form.type !== 'free_shipping' && (
                <label>
                  {form.type === 'percent' ? 'Pourcentage (1 à 100)' : 'Montant (FCFA)'}
                  <input
                    type="number"
                    min={1}
                    max={form.type === 'percent' ? 100 : undefined}
                    required
                    value={form.value}
                    onChange={(e) => set('value', e.target.value)}
                  />
                </label>
              )}
            </div>

            <div className="alert alert-info">{example}</div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Conditions</legend>

            <div className="form-grid">
              <label>
                Panier minimum (FCFA)
                <input
                  type="number"
                  min={0}
                  value={form.minAmount}
                  onChange={(e) => set('minAmount', e.target.value)}
                />
                <small>0 = aucune condition de montant.</small>
              </label>

              {form.type === 'percent' && (
                <label>
                  Remise maximale (FCFA)
                  <input
                    type="number"
                    min={0}
                    value={form.maxDiscount}
                    onChange={(e) => set('maxDiscount', e.target.value)}
                  />
                  <small>0 = pas de plafond. Protège des gros paniers.</small>
                </label>
              )}
            </div>

            <div className="form-grid">
              <label>
                Utilisations totales
                <input
                  type="number"
                  min={0}
                  value={form.maxRedemptions}
                  onChange={(e) => set('maxRedemptions', e.target.value)}
                />
                <small>
                  0 = illimité.
                  {isEdit && ` Déjà utilisé ${promotion!.redemptions} fois.`}
                </small>
              </label>

              <label>
                Utilisations par client
                <input
                  type="number"
                  min={0}
                  value={form.maxPerCustomer}
                  onChange={(e) => set('maxPerCustomer', e.target.value)}
                />
                <small>
                  0 = illimité et utilisable sans compte. Toute autre valeur impose la connexion.
                </small>
              </label>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Période de validité</legend>

            <div className="form-grid">
              <label>
                Début
                <input
                  type="date"
                  value={form.startsAt}
                  onChange={(e) => set('startsAt', e.target.value)}
                />
                <small>Vide = actif immédiatement.</small>
              </label>

              <label>
                Fin
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => set('expiresAt', e.target.value)}
                />
                <small>Vide = sans expiration.</small>
              </label>
            </div>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set('active', e.target.checked)}
              />
              <span>
                <strong>Code actif</strong>
                <small>Décochez pour suspendre le code sans toucher aux dates.</small>
              </span>
            </label>
          </fieldset>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button className="btn btn-dark" disabled={saving}>
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
