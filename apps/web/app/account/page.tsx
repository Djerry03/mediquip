'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatFcfa, useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch, ApiError } from '../lib/api';
import { ORDER_STATUS_LABELS } from '../lib/order-status';

type Order = {
  id: string;
  trackingToken: string;
  total: number;
  status: keyof typeof ORDER_STATUS_LABELS;
  createdAt: string;
  mode_reception: 'livraison' | 'retrait';
  code_retrait?: string;
  items: { name: string; qty: number }[];
};

export default function AccountPage() {
  const { lang, showToast } = useApp();
  const { user, loading, login, register, logout, updateProfile } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const t = {
    fr: {
      titleAuth: 'Mon compte',
      subLogin: 'Connectez-vous pour retrouver vos commandes et vos adresses.',
      subRegister: 'Créez un compte pour suivre vos commandes et commander plus vite.',
      login: 'Se connecter',
      register: 'Créer un compte',
      toRegister: 'Pas encore de compte ? Créez-en un',
      toLogin: 'Déjà un compte ? Connectez-vous',
      email: 'Adresse e-mail',
      password: 'Mot de passe',
      fullName: 'Nom complet',
      phone: 'Téléphone (facultatif)',
      passwordHint: '10 caractères minimum.',
      hello: 'Bonjour',
      logout: 'Se déconnecter',
      myOrders: 'Mes commandes',
      noOrders: "Vous n'avez pas encore passé de commande.",
      shop: 'Voir la boutique',
      track: 'Suivre',
      profile: 'Mes informations',
      save: 'Enregistrer',
      saved: 'Informations mises à jour.',
      pickupCode: 'Code de retrait',
      backoffice: 'Accéder au back-office',
      loading: 'Chargement…',
    },
    en: {
      titleAuth: 'My account',
      subLogin: 'Sign in to find your orders and saved addresses.',
      subRegister: 'Create an account to track your orders and check out faster.',
      login: 'Sign in',
      register: 'Create account',
      toRegister: 'No account yet? Create one',
      toLogin: 'Already have an account? Sign in',
      email: 'Email address',
      password: 'Password',
      fullName: 'Full name',
      phone: 'Phone (optional)',
      passwordHint: '10 characters minimum.',
      hello: 'Hello',
      logout: 'Sign out',
      myOrders: 'My orders',
      noOrders: 'You have not placed any order yet.',
      shop: 'Browse the shop',
      track: 'Track',
      profile: 'My details',
      save: 'Save',
      saved: 'Details updated.',
      pickupCode: 'Pickup code',
      backoffice: 'Open back office',
      loading: 'Loading…',
    },
  }[lang];

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      setOrders(await apiFetch<Order[]>('/orders/me', { auth: true }));
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadOrders();
  }, [user, loadOrders]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phone: form.phone || undefined,
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    try {
      await updateProfile({
        fullName: String(data.get('fullName') || ''),
        phone: String(data.get('phone') || '') || undefined,
      });
      showToast(t.saved);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Erreur');
    }
  };

  if (loading) {
    return <p style={{ marginTop: 32, color: 'var(--ink-soft)' }}>{t.loading}</p>;
  }

  // ------------------------------------------------------------ Non connecté
  if (!user) {
    return (
      <div className="auth-page">
        <div className="page-header">
          <h1>{t.titleAuth}</h1>
        </div>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>
          {mode === 'login' ? t.subLogin : t.subRegister}
        </p>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && (
            <label>
              {t.fullName}
              <input
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                autoComplete="name"
              />
            </label>
          )}

          <label>
            {t.email}
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
          </label>

          <label>
            {t.password}
            <input
              type="password"
              required
              minLength={mode === 'register' ? 10 : undefined}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {mode === 'register' && <small>{t.passwordHint}</small>}
          </label>

          {mode === 'register' && (
            <label>
              {t.phone}
              <input
                type="tel"
                placeholder="6XX XX XX XX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                autoComplete="tel"
              />
            </label>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          <button className="btn btn-dark btn-block" disabled={submitting}>
            {submitting ? '…' : mode === 'login' ? t.login : t.register}
          </button>
        </form>

        <button
          className="link"
          style={{ marginTop: 14, background: 'none', border: 0, cursor: 'pointer' }}
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? t.toRegister : t.toLogin}
        </button>
      </div>
    );
  }

  // --------------------------------------------------------------- Connecté
  return (
    <>
      <div className="page-header">
        <h1>
          {t.hello} {user.fullName.split(' ')[0]}
        </h1>
        <button className="btn btn-ghost" onClick={logout}>
          {t.logout}
        </button>
      </div>

      {user.role === 'admin' && (
        <Link href={'/admin' as any} className="btn btn-outline" style={{ marginBottom: 20 }}>
          {t.backoffice} →
        </Link>
      )}

      <section className="section">
        <div className="section-head">
          <h2>{t.myOrders}</h2>
        </div>

        {ordersLoading ? (
          <p style={{ color: 'var(--ink-soft)' }}>{t.loading}</p>
        ) : orders.length === 0 ? (
          <>
            <p style={{ color: 'var(--ink-soft)' }}>{t.noOrders}</p>
            <Link href="/catalog" className="btn btn-primary" style={{ marginTop: 12 }}>
              {t.shop}
            </Link>
          </>
        ) : (
          <div className="order-list">
            {orders.map((o) => (
              <div className="order-card" key={o.id}>
                <div className="order-card-head">
                  <strong>{o.id}</strong>
                  <span className={`status-pill status-${o.status}`}>
                    {ORDER_STATUS_LABELS[o.status]?.[lang] ?? o.status}
                  </span>
                </div>
                <span className="cart-line-meta">
                  {new Date(o.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')} ·{' '}
                  {o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                </span>
                <div className="order-card-foot">
                  <strong>{formatFcfa(o.total)}</strong>
                  {o.code_retrait && (
                    <span className="badge">
                      {t.pickupCode} : <code>{o.code_retrait}</code>
                    </span>
                  )}
                  <Link href={`/tracking?id=${o.id}&token=${o.trackingToken}` as any} className="link">
                    {t.track} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{t.profile}</h2>
        </div>
        <form className="auth-form" onSubmit={saveProfile}>
          <label>
            {t.fullName}
            <input name="fullName" defaultValue={user.fullName} required />
          </label>
          <label>
            {t.phone}
            <input name="phone" type="tel" defaultValue={user.phone || ''} placeholder="6XX XX XX XX" />
          </label>
          <label>
            {t.email}
            <input value={user.email} disabled />
          </label>
          <button className="btn btn-outline" style={{ width: 'fit-content' }}>
            {t.save}
          </button>
        </form>
      </section>
    </>
  );
}
