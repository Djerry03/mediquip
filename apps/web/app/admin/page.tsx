'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatFcfa, useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch, ApiError, API_URL, getToken } from '../lib/api';
import {
  ORDER_STATUS_LABELS,
  OrderStatus,
  PAYMENT_STATUS_LABELS,
} from '../lib/order-status';

/**
 * Transitions autorisées — miroir de la machine à états de l'API.
 * L'API reste seule juge : cette table ne fait qu'éviter de proposer
 * un bouton qui serait de toute façon refusé.
 */
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned', 'cancelled'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

type Order = {
  id: string;
  client: string;
  phone: string;
  address: string;
  total: number;
  status: OrderStatus;
  paymentStatus: keyof typeof PAYMENT_STATUS_LABELS;
  mode_reception: 'livraison' | 'retrait';
  code_retrait?: string;
  point_repere_client?: string;
  requiresPrescription: boolean;
  prescriptionVerified: boolean;
  createdAt: string;
  items: { name: string; qty: number }[];
};

type Product = {
  id: string;
  name: { fr: string; en: string };
  price: number;
  oldPrice?: number;
  actif: boolean;
  necessite_ordonnance: boolean;
  livraison_autorisee: boolean;
};

type Promotion = {
  id: string;
  code: string;
  type: 'percent' | 'fixed' | 'free_shipping';
  value: number;
  minAmount: number;
  redemptions: number;
  maxRedemptions: number;
  expiresAt?: string;
  active: boolean;
};

type Review = {
  id: string;
  productId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type Tab = 'orders' | 'catalog' | 'promotions' | 'reviews' | 'prescriptions';

export default function AdminPage() {
  const { lang, showToast } = useApp();
  const { user, loading: authLoading, isAdmin } = useAuth();

  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newPromo, setNewPromo] = useState({
    code: '',
    type: 'percent' as Promotion['type'],
    value: 10,
    minAmount: 0,
  });

  const t = {
    fr: {
      title: 'Back-office',
      denied: 'Cette page est réservée aux administrateurs.',
      signIn: 'Se connecter',
      loading: 'Chargement…',
      tabs: {
        orders: 'Commandes',
        catalog: 'Catalogue',
        promotions: 'Codes promo',
        reviews: 'Avis à modérer',
        prescriptions: 'Ordonnances',
      },
      allStatuses: 'Tous les statuts',
      searchPh: 'N° commande, nom ou téléphone…',
      noOrders: 'Aucune commande.',
      verifyPrescription: 'Marquer l’ordonnance vérifiée',
      prescriptionPending: '⚠️ Ordonnance à vérifier',
      prescriptionOk: '✓ Ordonnance vérifiée',
      pickup: 'Retrait',
      delivery: 'Livraison',
      code: 'Code',
      noProducts: 'Aucun produit.',
      active: 'Actif',
      inactive: 'Désactivé',
      deactivate: 'Désactiver',
      newPromo: 'Nouveau code promo',
      create: 'Créer',
      disable: 'Désactiver',
      uses: 'utilisations',
      noPromos: 'Aucun code promo.',
      noReviews: 'Aucun avis en attente.',
      publish: 'Publier',
      reject: 'Rejeter',
      noPrescriptions: 'Aucune demande.',
      download: 'Voir le document',
    },
    en: {
      title: 'Back office',
      denied: 'This page is restricted to administrators.',
      signIn: 'Sign in',
      loading: 'Loading…',
      tabs: {
        orders: 'Orders',
        catalog: 'Catalog',
        promotions: 'Promo codes',
        reviews: 'Reviews to moderate',
        prescriptions: 'Prescriptions',
      },
      allStatuses: 'All statuses',
      searchPh: 'Order no., name or phone…',
      noOrders: 'No order.',
      verifyPrescription: 'Mark prescription verified',
      prescriptionPending: '⚠️ Prescription to verify',
      prescriptionOk: '✓ Prescription verified',
      pickup: 'Pickup',
      delivery: 'Delivery',
      code: 'Code',
      noProducts: 'No product.',
      active: 'Active',
      inactive: 'Disabled',
      deactivate: 'Disable',
      newPromo: 'New promo code',
      create: 'Create',
      disable: 'Disable',
      uses: 'uses',
      noPromos: 'No promo code.',
      noReviews: 'No pending review.',
      publish: 'Publish',
      reject: 'Reject',
      noPrescriptions: 'No request.',
      download: 'View document',
    },
  }[lang];

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      switch (tab) {
        case 'orders': {
          const query = new URLSearchParams();
          if (statusFilter) query.set('status', statusFilter);
          if (search) query.set('search', search);
          const res = await apiFetch<{ items: Order[] }>(`/orders/admin?${query}`, { auth: true });
          setOrders(res.items);
          break;
        }
        case 'catalog':
          setProducts(await apiFetch<Product[]>('/products/admin', { auth: true }));
          break;
        case 'promotions':
          setPromotions(await apiFetch<Promotion[]>('/promotions', { auth: true }));
          break;
        case 'reviews':
          setReviews(await apiFetch<Review[]>('/reviews/pending', { auth: true }));
          break;
        case 'prescriptions':
          setPrescriptions(await apiFetch<any[]>('/prescriptions', { auth: true }));
          break;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [tab, isAdmin, statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Le document d'ordonnance est protégé par le jeton : un `<a href>` simple
   * n'enverrait pas l'en-tête Authorization. On le récupère donc en fetch,
   * puis on l'ouvre depuis une URL blob éphémère.
   */
  const openPrescriptionFile = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/prescriptions/${id}/file`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const url = URL.createObjectURL(await res.blob());
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      showToast(lang === 'fr' ? 'Document indisponible.' : 'Document unavailable.');
    }
  };

  const act = async (fn: () => Promise<unknown>, successMessage: string) => {
    try {
      await fn();
      showToast(successMessage);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Erreur');
    }
  };

  // ------------------------------------------------------------- Accès
  if (authLoading) {
    return <p style={{ marginTop: 32, color: 'var(--ink-soft)' }}>{t.loading}</p>;
  }

  // L'autorisation réelle est appliquée par l'API sur chaque requête ;
  // ce garde-fou évite simplement d'afficher une coquille vide.
  if (!user || !isAdmin) {
    return (
      <div style={{ marginTop: 32 }}>
        <div className="alert alert-warn">{t.denied}</div>
        <Link href={'/account' as any} className="btn btn-primary" style={{ marginTop: 12 }}>
          {t.signIn}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>{t.title}</h1>
        <span className="cart-line-meta">{user.email}</span>
      </div>

      <nav className="admin-tabs">
        {(Object.keys(t.tabs) as Tab[]).map((key) => (
          <button
            key={key}
            className={tab === key ? 'active' : ''}
            onClick={() => setTab(key)}
          >
            {t.tabs[key]}
          </button>
        ))}
      </nav>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p style={{ color: 'var(--ink-soft)' }}>{t.loading}</p>}

      {/* ------------------------------------------------------ Commandes */}
      {tab === 'orders' && !loading && (
        <>
          <div className="filters">
            <div className="search-box">
              🔎
              <input
                type="search"
                placeholder={t.searchPh}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">{t.allStatuses}</option>
              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s][lang]}
                </option>
              ))}
            </select>
          </div>

          {orders.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>{t.noOrders}</p>
          ) : (
            <div className="order-list">
              {orders.map((o) => (
                <div className="order-card" key={o.id}>
                  <div className="order-card-head">
                    <strong>{o.id}</strong>
                    <span className={`status-pill status-${o.status}`}>
                      {ORDER_STATUS_LABELS[o.status][lang]}
                    </span>
                    <span className="badge">
                      {PAYMENT_STATUS_LABELS[o.paymentStatus]?.[lang]}
                    </span>
                  </div>

                  <span className="cart-line-meta">
                    {o.client} · {o.phone} ·{' '}
                    {o.mode_reception === 'retrait' ? t.pickup : t.delivery} · {o.address}
                    {o.point_repere_client ? ` (${o.point_repere_client})` : ''}
                  </span>
                  <span className="cart-line-meta">
                    {o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                  </span>
                  {o.code_retrait && (
                    <span className="badge">
                      {t.code} : <code>{o.code_retrait}</code>
                    </span>
                  )}

                  {o.requiresPrescription && (
                    <div className={`alert ${o.prescriptionVerified ? 'alert-info' : 'alert-warn'}`}>
                      {o.prescriptionVerified ? t.prescriptionOk : t.prescriptionPending}
                      {!o.prescriptionVerified && (
                        <button
                          className="btn btn-outline"
                          style={{ marginLeft: 10 }}
                          onClick={() =>
                            act(
                              () =>
                                apiFetch(`/orders/${o.id}/prescription-verified`, {
                                  method: 'PATCH',
                                  auth: true,
                                }),
                              t.prescriptionOk,
                            )
                          }
                        >
                          {t.verifyPrescription}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="order-card-foot">
                    <strong>{formatFcfa(o.total)}</strong>
                    {NEXT_STATUSES[o.status].map((next) => (
                      <button
                        key={next}
                        className="btn btn-outline"
                        onClick={() =>
                          act(
                            () =>
                              apiFetch(`/orders/${o.id}/status`, {
                                method: 'PATCH',
                                auth: true,
                                body: JSON.stringify({ status: next }),
                              }),
                            `${o.id} → ${ORDER_STATUS_LABELS[next][lang]}`,
                          )
                        }
                      >
                        → {ORDER_STATUS_LABELS[next][lang]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------- Catalogue */}
      {tab === 'catalog' && !loading && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{lang === 'fr' ? 'Nom' : 'Name'}</th>
                <th>{lang === 'fr' ? 'Prix' : 'Price'}</th>
                <th>{lang === 'fr' ? 'Statut' : 'Status'}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <code>{p.id}</code>
                  </td>
                  <td>
                    {p.name.fr}
                    {p.necessite_ordonnance && ' 📋'}
                    {!p.livraison_autorisee && ' 🏪'}
                  </td>
                  <td>
                    {formatFcfa(p.price)}
                    {p.oldPrice && p.oldPrice > p.price && (
                      <s style={{ color: 'var(--ink-soft)', marginLeft: 6 }}>
                        {formatFcfa(p.oldPrice)}
                      </s>
                    )}
                  </td>
                  <td>{p.actif ? t.active : t.inactive}</td>
                  <td>
                    {p.actif && (
                      <button
                        className="link-danger"
                        onClick={() =>
                          act(
                            () => apiFetch(`/products/${p.id}`, { method: 'DELETE', auth: true }),
                            `${p.id} ${t.inactive.toLowerCase()}`,
                          )
                        }
                      >
                        {t.deactivate}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>{t.noProducts}</p>}
        </div>
      )}

      {/* ------------------------------------------------------ Promotions */}
      {tab === 'promotions' && !loading && (
        <>
          <form
            className="admin-inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              act(
                () =>
                  apiFetch('/promotions', {
                    method: 'POST',
                    auth: true,
                    body: JSON.stringify(newPromo),
                  }),
                `${newPromo.code} créé`,
              );
              setNewPromo({ code: '', type: 'percent', value: 10, minAmount: 0 });
            }}
          >
            <strong>{t.newPromo}</strong>
            <input
              required
              placeholder="MEDI10"
              value={newPromo.code}
              onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
            />
            <select
              value={newPromo.type}
              onChange={(e) =>
                setNewPromo({ ...newPromo, type: e.target.value as Promotion['type'] })
              }
            >
              <option value="percent">%</option>
              <option value="fixed">FCFA</option>
              <option value="free_shipping">
                {lang === 'fr' ? 'Livraison offerte' : 'Free shipping'}
              </option>
            </select>
            <input
              type="number"
              min={0}
              value={newPromo.value}
              onChange={(e) => setNewPromo({ ...newPromo, value: Number(e.target.value) })}
            />
            <input
              type="number"
              min={0}
              placeholder={lang === 'fr' ? 'Montant min.' : 'Min amount'}
              value={newPromo.minAmount}
              onChange={(e) => setNewPromo({ ...newPromo, minAmount: Number(e.target.value) })}
            />
            <button className="btn btn-dark">{t.create}</button>
          </form>

          {promotions.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>{t.noPromos}</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t.code}</th>
                    <th>Type</th>
                    <th>{lang === 'fr' ? 'Valeur' : 'Value'}</th>
                    <th>{lang === 'fr' ? 'Min.' : 'Min.'}</th>
                    <th>{t.uses}</th>
                    <th>{lang === 'fr' ? 'Statut' : 'Status'}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <code>{p.code}</code>
                      </td>
                      <td>{p.type}</td>
                      <td>{p.type === 'percent' ? `${p.value} %` : formatFcfa(p.value)}</td>
                      <td>{p.minAmount ? formatFcfa(p.minAmount) : '—'}</td>
                      <td>
                        {p.redemptions}
                        {p.maxRedemptions ? ` / ${p.maxRedemptions}` : ''}
                      </td>
                      <td>{p.active ? t.active : t.inactive}</td>
                      <td>
                        {p.active && (
                          <button
                            className="link-danger"
                            onClick={() =>
                              act(
                                () =>
                                  apiFetch(`/promotions/${p.id}`, {
                                    method: 'DELETE',
                                    auth: true,
                                  }),
                                `${p.code} ${t.inactive.toLowerCase()}`,
                              )
                            }
                          >
                            {t.disable}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ----------------------------------------------------------- Avis */}
      {tab === 'reviews' && !loading && (
        <>
          {reviews.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>{t.noReviews}</p>
          ) : (
            <div className="order-list">
              {reviews.map((r) => (
                <div className="order-card" key={r.id}>
                  <div className="order-card-head">
                    <strong>{r.authorName}</strong>
                    <span className="stars">
                      {'★'.repeat(r.rating)}
                      {'☆'.repeat(5 - r.rating)}
                    </span>
                    <code>{r.productId}</code>
                  </div>
                  <p>{r.comment}</p>
                  <div className="order-card-foot">
                    <button
                      className="btn btn-outline"
                      onClick={() =>
                        act(
                          () =>
                            apiFetch(`/reviews/${r.id}`, {
                              method: 'PATCH',
                              auth: true,
                              body: JSON.stringify({ status: 'published' }),
                            }),
                          t.publish,
                        )
                      }
                    >
                      {t.publish}
                    </button>
                    <button
                      className="link-danger"
                      onClick={() =>
                        act(
                          () =>
                            apiFetch(`/reviews/${r.id}`, {
                              method: 'PATCH',
                              auth: true,
                              body: JSON.stringify({ status: 'rejected' }),
                            }),
                          t.reject,
                        )
                      }
                    >
                      {t.reject}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* --------------------------------------------------- Ordonnances */}
      {tab === 'prescriptions' && !loading && (
        <>
          {prescriptions.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>{t.noPrescriptions}</p>
          ) : (
            <div className="order-list">
              {prescriptions.map((p) => (
                <div className="order-card" key={p.id}>
                  <div className="order-card-head">
                    <strong>{p.clientName}</strong>
                    <span className="badge">{p.status}</span>
                  </div>
                  <span className="cart-line-meta">
                    {p.phone}
                    {p.email ? ` · ${p.email}` : ''} ·{' '}
                    {new Date(p.createdAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
                  </span>
                  {p.note && <p>{p.note}</p>}
                  <div className="order-card-foot">
                    <button className="link" onClick={() => openPrescriptionFile(p.id)}>
                      {t.download} →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
