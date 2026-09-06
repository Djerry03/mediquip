'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { API_URL, ApiError } from '../lib/api';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const MAX_SIZE = 8 * 1024 * 1024;

export default function UploadListPage() {
  const { lang } = useApp();
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', note: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [dragging, setDragging] = useState(false);

  const t = {
    fr: {
      title: 'Envoyer ma liste ou mon ordonnance',
      sub: 'Vous avez une liste de matériel ou une ordonnance ? Photographiez-la et envoyez-la nous. Notre équipe vous rappelle sous 24h avec un devis gratuit.',
      dragDrop: 'Glissez votre photo ou PDF ici, ou cliquez pour parcourir',
      formats: 'JPEG, PNG, WebP ou PDF — 8 Mo maximum.',
      name: 'Nom complet',
      phone: 'Téléphone',
      email: 'E-mail (facultatif)',
      note: 'Précisions (facultatif)',
      notePh: 'Quantités, urgence, adresse de livraison souhaitée…',
      send: 'Envoyer ma demande',
      sending: 'Envoi en cours…',
      change: 'Changer de fichier',
      errorSelect: 'Sélectionnez une photo ou un PDF.',
      errorFormat: 'Format non accepté. Envoyez une photo (JPEG, PNG, WebP) ou un PDF.',
      errorSize: 'Fichier trop volumineux (8 Mo maximum).',
      okTitle: 'Demande envoyée',
      okBody: 'Notre équipe examine votre document et vous rappelle sous 24h avec un devis.',
      okAccount: 'Suivez vos demandes depuis votre compte.',
      back: 'Retour à la boutique',
      privacy:
        'Votre document est stocké de façon confidentielle et n’est consulté que par notre équipe pharmaceutique.',
    },
    en: {
      title: 'Send my list or prescription',
      sub: 'Have an equipment list or a prescription? Take a photo and send it. Our team calls you back within 24h with a free quote.',
      dragDrop: 'Drop your photo or PDF here, or click to browse',
      formats: 'JPEG, PNG, WebP or PDF — 8 MB maximum.',
      name: 'Full name',
      phone: 'Phone',
      email: 'Email (optional)',
      note: 'Details (optional)',
      notePh: 'Quantities, urgency, preferred delivery address…',
      send: 'Send my request',
      sending: 'Sending…',
      change: 'Change file',
      errorSelect: 'Select a photo or a PDF.',
      errorFormat: 'Unsupported format. Send a photo (JPEG, PNG, WebP) or a PDF.',
      errorSize: 'File too large (8 MB maximum).',
      okTitle: 'Request sent',
      okBody: 'Our team reviews your document and calls you back within 24h with a quote.',
      okAccount: 'Track your requests from your account.',
      back: 'Back to the shop',
      privacy:
        'Your document is stored confidentially and is only reviewed by our pharmaceutical team.',
    },
  }[lang];

  const acceptFile = (candidate: File): boolean => {
    if (!ACCEPTED.includes(candidate.type)) {
      setError(t.errorFormat);
      return false;
    }
    if (candidate.size > MAX_SIZE) {
      setError(t.errorSize);
      return false;
    }

    setError(null);
    setFile(candidate);
    setPreviewUrl(candidate.type.startsWith('image/') ? URL.createObjectURL(candidate) : null);
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError(t.errorSelect);

    setLoading(true);
    setError(null);

    const body = new FormData();
    body.append('file', file);
    body.append('clientName', form.name);
    body.append('phone', form.phone);
    if (form.email) body.append('email', form.email);
    if (form.note) body.append('note', form.note);

    try {
      // FormData impose son propre Content-Type (avec boundary) : on ne le fixe pas.
      const res = await fetch(`${API_URL}/prescriptions`, {
        method: 'POST',
        credentials: 'include',
        body,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new ApiError(
          (payload &&
            (Array.isArray(payload.message) ? payload.message.join(' ') : payload.message)) ||
            `Erreur ${res.status}`,
          res.status,
        );
      }

      // On n'affiche la confirmation que si le serveur a réellement accepté.
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Votre demande n’a pas pu être envoyée. Vérifiez votre connexion et réessayez.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="confirm-panel">
        <span className="confirm-check">✓</span>
        <h1>{t.okTitle}</h1>
        <p>{t.okBody}</p>
        {user && <p className="cart-note">{t.okAccount}</p>}
        <div className="confirm-actions">
          <Link href="/catalog" className="btn btn-dark">
            {t.back}
          </Link>
          {user && (
            <Link href={'/account' as any} className="btn btn-ghost">
              {lang === 'fr' ? 'Mon compte' : 'My account'}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>{t.title}</h1>
      </div>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>{t.sub}</p>

      <form className="upload-layout" onSubmit={submit}>
        <div
          className={`dropzone ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files?.[0]) acceptFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            hidden
            onChange={(e) => e.target.files?.[0] && acceptFile(e.target.files[0])}
          />

          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" style={{ maxWidth: '100%', maxHeight: 320 }} />
          ) : file ? (
            <p>📄 {file.name}</p>
          ) : (
            <>
              <p>📎 {t.dragDrop}</p>
              <small>{t.formats}</small>
            </>
          )}
        </div>

        <div className="upload-form">
          <label>
            {t.name}
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoComplete="name"
            />
          </label>

          <label>
            {t.phone}
            <input
              type="tel"
              required
              placeholder="6XX XX XX XX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              autoComplete="tel"
            />
          </label>

          <label>
            {t.email}
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
          </label>

          <label>
            {t.note}
            <textarea
              rows={3}
              placeholder={t.notePh}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </label>

          {error && <div className="alert alert-error">{error}</div>}

          <button className="btn btn-dark btn-block" disabled={loading}>
            {loading ? t.sending : t.send}
          </button>

          <small style={{ color: 'var(--ink-soft)' }}>🔒 {t.privacy}</small>
        </div>
      </form>
    </>
  );
}
