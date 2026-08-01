'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch, ApiError } from '../lib/api';

type Review = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export default function ProductReviews({ productId }: { productId: string }) {
  const { lang, showToast } = useApp();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const t = {
    fr: {
      title: 'Avis clients',
      none: "Aucun avis publié pour ce produit pour l'instant.",
      loading: 'Chargement des avis…',
      write: 'Laisser un avis',
      rating: 'Note',
      comment: 'Votre avis',
      send: "Publier l'avis",
      sending: 'Envoi…',
      moderated: 'Les avis sont modérés avant publication.',
      loginPrompt: 'Connectez-vous pour laisser un avis.',
      login: 'Se connecter',
      thanks: 'Merci ! Votre avis sera publié après modération.',
      mustBuy: 'Seuls les clients ayant reçu ce produit peuvent le noter.',
    },
    en: {
      title: 'Customer reviews',
      none: 'No published review for this product yet.',
      loading: 'Loading reviews…',
      write: 'Write a review',
      rating: 'Rating',
      comment: 'Your review',
      send: 'Post review',
      sending: 'Sending…',
      moderated: 'Reviews are moderated before publishing.',
      loginPrompt: 'Sign in to leave a review.',
      login: 'Sign in',
      thanks: 'Thank you! Your review will appear after moderation.',
      mustBuy: 'Only customers who received this product can rate it.',
    },
  }[lang];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Review[]>(`/products/${productId}/reviews`);
      setReviews(Array.isArray(data) ? data : []);
      setAvailable(true);
    } catch (err) {
      // Endpoint absent : on masque simplement la section plutôt que
      // d'afficher une erreur qui n'apprend rien au visiteur.
      if (err instanceof ApiError && err.status === 404) setAvailable(false);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!available) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/products/${productId}/reviews`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ rating, comment }),
      });
      setComment('');
      setRating(5);
      showToast(t.thanks);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t.mustBuy);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reviews">
      <h2 style={{ fontSize: 20, marginBottom: 16 }}>{t.title}</h2>

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>{t.loading}</p>
      ) : reviews.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)' }}>{t.none}</p>
      ) : (
        reviews.map((r) => (
          <div className="review" key={r.id}>
            <div className="rhead">
              <span>{r.authorName}</span>
              <span className="stars">
                {'★'.repeat(r.rating)}
                {'☆'.repeat(5 - r.rating)}
              </span>
            </div>
            <p>{r.comment}</p>
            <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
              {new Date(r.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
            </span>
          </div>
        ))
      )}

      {user ? (
        <form className="review-form" onSubmit={submit}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>{t.write}</label>

          <div className="rating-input" role="radiogroup" aria-label={t.rating}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n}/5`}
                className={`star-btn ${n <= rating ? 'on' : ''}`}
                onClick={() => setRating(n)}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            required
            minLength={10}
            maxLength={1000}
            placeholder={t.comment}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          {formError && <div className="alert alert-error">{formError}</div>}

          <button className="btn btn-outline" style={{ width: 'fit-content' }} disabled={submitting}>
            {submitting ? t.sending : t.send}
          </button>
          <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{t.moderated}</span>
        </form>
      ) : (
        <div className="review-form">
          <p style={{ fontSize: 13 }}>{t.loginPrompt}</p>
          <Link href={'/account' as any} className="btn btn-outline" style={{ width: 'fit-content' }}>
            {t.login}
          </Link>
        </div>
      )}
    </div>
  );
}
