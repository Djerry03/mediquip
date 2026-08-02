'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api';

type Audience = 'newsletter' | 'buyers' | 'dormant';
type Status = 'draft' | 'sending' | 'sent' | 'failed';

type Campaign = {
  id: string;
  name: string;
  subject: string;
  body: string;
  audience: Audience;
  status: Status;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sentAt?: string;
  sentByEmail?: string;
  createdAt: string;
};

const AUDIENCES: { value: Audience; label: string; hint: string }[] = [
  {
    value: 'newsletter',
    label: 'Tous les inscrits',
    hint: 'Tous les clients ayant accepté de recevoir vos actualités.',
  },
  {
    value: 'buyers',
    label: 'Clients ayant déjà acheté',
    hint: 'Inscrits ayant reçu au moins une commande. Pour fidéliser.',
  },
  {
    value: 'dormant',
    label: 'Clients dormants',
    hint: 'Inscrits sans commande livrée depuis 90 jours. Pour relancer.',
  },
];

const STATUS_LABELS: Record<Status, { label: string; tone: string }> = {
  draft: { label: 'Brouillon', tone: 'off' },
  sending: { label: 'Envoi en cours', tone: 'scheduled' },
  sent: { label: 'Envoyée', tone: 'live' },
  failed: { label: 'Échec', tone: 'off' },
};

export default function EmailCampaignPanel({ notify }: { notify: (m: string) => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sizes, setSizes] = useState<Record<Audience, number>>({
    newsletter: 0,
    buyers: 0,
    dormant: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Campaign | null | undefined>(undefined);
  const [testEmail, setTestEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, audiences] = await Promise.all([
        apiFetch<Campaign[]>('/email-campaigns', { auth: true }),
        apiFetch<Record<Audience, number>>('/email-campaigns/audiences', { auth: true }),
      ]);
      setCampaigns(list);
      setSizes(audiences);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Une campagne en cours d'envoi progresse côté serveur : on rafraîchit
  // tant qu'il en reste une, puis on arrête pour ne pas interroger l'API
  // en boucle sans raison.
  useEffect(() => {
    if (!campaigns.some((c) => c.status === 'sending')) return;
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [campaigns, load]);

  const act = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      notify(message);
      load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erreur');
    }
  };

  const send = (campaign: Campaign) => {
    const size = sizes[campaign.audience];
    if (
      !confirm(
        `Envoyer « ${campaign.name} » à ${size} destinataire(s) ?\n\nUn e-mail parti ne peut pas être rappelé. Faites d'abord un envoi d'essai si vous hésitez.`,
      )
    ) {
      return;
    }
    act(
      () => apiFetch(`/email-campaigns/${campaign.id}/send`, { method: 'POST', auth: true }),
      'Envoi lancé.',
    );
  };

  return (
    <>
      <div className="audience-row">
        {AUDIENCES.map((a) => (
          <div className="audience-card" key={a.value}>
            <strong>{sizes[a.value]}</strong>
            <span>{a.label}</span>
            <small>{a.hint}</small>
          </div>
        ))}
      </div>

      <div className="alert alert-info">
        Seuls les clients ayant coché « recevoir nos offres » à l’inscription ou dans leur compte
        sont comptés. Un lien de désinscription est ajouté automatiquement à chaque e-mail : vous
        n’avez pas à l’écrire.
      </div>

      <div className="filters">
        <button className="btn btn-dark" onClick={() => setEditing(null)}>
          ＋ Nouvelle campagne
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Chargement…</p>
      ) : campaigns.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)' }}>Aucune campagne.</p>
      ) : (
        <div className="order-list">
          {campaigns.map((c) => {
            const status = STATUS_LABELS[c.status];
            const audience = AUDIENCES.find((a) => a.value === c.audience);
            return (
              <div className="order-card" key={c.id}>
                <div className="order-card-head">
                  <strong>{c.name}</strong>
                  <span className={`status-pill banner-${status.tone}`}>{status.label}</span>
                  <span className="badge">{audience?.label ?? c.audience}</span>
                </div>

                <span className="cart-line-meta">Objet : {c.subject}</span>
                <p className="campaign-excerpt">{c.body}</p>

                {c.status === 'draft' ? (
                  <span className="cart-line-meta">
                    Cible actuelle : {sizes[c.audience]} destinataire(s)
                  </span>
                ) : (
                  <span className="cart-line-meta">
                    {c.sentCount} / {c.recipientCount} envoyé(s)
                    {c.failedCount > 0 && ` · ${c.failedCount} échec(s)`}
                    {c.sentAt && ` · ${new Date(c.sentAt).toLocaleString('fr-FR')}`}
                    {c.sentByEmail && ` · par ${c.sentByEmail}`}
                  </span>
                )}

                <div className="order-card-foot">
                  {c.status === 'draft' && (
                    <>
                      <button className="link" onClick={() => setEditing(c)}>
                        Modifier
                      </button>
                      <button className="btn btn-dark" onClick={() => send(c)}>
                        Envoyer
                      </button>
                    </>
                  )}
                  <button
                    className="link"
                    onClick={() =>
                      act(
                        () =>
                          apiFetch(`/email-campaigns/${c.id}/duplicate`, {
                            method: 'POST',
                            auth: true,
                          }),
                        'Copie créée en brouillon.',
                      )
                    }
                  >
                    Dupliquer
                  </button>
                  {c.status !== 'sending' && (
                    <button
                      className="link-danger"
                      onClick={() => {
                        if (confirm(`Supprimer la campagne « ${c.name} » ?`)) {
                          act(
                            () =>
                              apiFetch(`/email-campaigns/${c.id}`, {
                                method: 'DELETE',
                                auth: true,
                              }),
                            'Campagne supprimée.',
                          );
                        }
                      }}
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing !== undefined && (
        <CampaignForm
          campaign={editing}
          sizes={sizes}
          testEmail={testEmail}
          setTestEmail={setTestEmail}
          onClose={() => setEditing(undefined)}
          onSaved={load}
          notify={notify}
        />
      )}
    </>
  );
}

function CampaignForm({
  campaign,
  sizes,
  testEmail,
  setTestEmail,
  onClose,
  onSaved,
  notify,
}: {
  campaign: Campaign | null;
  sizes: Record<Audience, number>;
  testEmail: string;
  setTestEmail: (v: string) => void;
  onClose: () => void;
  onSaved: () => void;
  notify: (m: string) => void;
}) {
  const isEdit = campaign !== null;

  const [form, setForm] = useState({
    name: campaign?.name ?? '',
    subject: campaign?.subject ?? '',
    body: campaign?.body ?? '',
    audience: (campaign?.audience ?? 'newsletter') as Audience,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (isEdit) {
        await apiFetch(`/email-campaigns/${campaign!.id}`, {
          method: 'PATCH',
          auth: true,
          body: JSON.stringify(form),
        });
        notify('Campagne mise à jour.');
      } else {
        await apiFetch('/email-campaigns', {
          method: 'POST',
          auth: true,
          body: JSON.stringify(form),
        });
        notify('Campagne créée en brouillon.');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!isEdit) return setError('Enregistrez d’abord la campagne pour tester l’envoi.');
    if (!testEmail) return setError('Indiquez une adresse de test.');

    try {
      await apiFetch(`/email-campaigns/${campaign!.id}/test`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ email: testEmail }),
      });
      notify(`Essai envoyé à ${testEmail}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi d’essai impossible.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{isEdit ? `Modifier « ${campaign!.name} »` : 'Nouvelle campagne e-mail'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <form className="modal-body" onSubmit={submit}>
          <fieldset className="form-section">
            <legend>Destinataires</legend>

            <label>
              Nom interne
              <input
                required
                placeholder="Relance rentrée septembre"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </label>

            <label>
              Audience
              <select
                value={form.audience}
                onChange={(e) => set('audience', e.target.value as Audience)}
              >
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label} — {sizes[a.value]} destinataire(s)
                  </option>
                ))}
              </select>
              <small>{AUDIENCES.find((a) => a.value === form.audience)?.hint}</small>
            </label>
          </fieldset>

          <fieldset className="form-section">
            <legend>Message</legend>

            <label>
              Objet de l’e-mail
              <input
                required
                maxLength={150}
                placeholder="−10 % sur les packs jusqu’au 30 septembre"
                value={form.subject}
                onChange={(e) => set('subject', e.target.value)}
              />
              <small>{form.subject.length}/150 caractères.</small>
            </label>

            <label>
              Corps du message
              <textarea
                required
                rows={10}
                minLength={20}
                maxLength={10_000}
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
              />
              <small>
                Texte simple, sans mise en forme. La formule d’appel, la signature et le lien de
                désinscription sont ajoutés automatiquement.
              </small>
            </label>
          </fieldset>

          {isEdit && (
            <fieldset className="form-section">
              <legend>Essai avant envoi</legend>
              <div className="csv-actions">
                <input
                  type="email"
                  placeholder="votre.adresse@mediquipe.cm"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
                <button type="button" className="btn btn-outline" onClick={sendTest}>
                  Envoyer un essai
                </button>
              </div>
              <small style={{ color: 'var(--ink-soft)' }}>
                L’essai part vers cette seule adresse et ne change pas le statut de la campagne.
              </small>
            </fieldset>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button className="btn btn-dark" disabled={saving}>
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le brouillon'}
            </button>
          </div>

          {!isEdit && (
            <p className="cart-note">
              La campagne est créée en brouillon : rien ne part tant que vous ne cliquez pas sur
              « Envoyer » dans la liste.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
