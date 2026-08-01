'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatFcfa, useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch, ApiError, API_URL, getToken } from '../lib/api';
import { ORDER_STATUS_LABELS, OrderStatus, PAYMENT_STATUS_LABELS } from '../lib/order-status';
import ProductForm from './ProductForm';
import PromotionForm from './PromotionForm';
import BannerForm from './BannerForm';
import CsvPanel from './CsvPanel';
import {
  AdminOrder,
  AdminProduct,
  Banner,
  BANNER_PLACEMENTS,
  PrescriptionRequest,
  Promotion,
  Review,
} from './types';

/**
 * Transitions autorisées — miroir de la machine à états de l'API.
 * L'API reste seule juge : cette table évite seulement de proposer un
 * bouton qui serait de toute façon refusé.
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

type Tab = 'orders' | 'catalog' | 'promotions' | 'banners' | 'reviews' | 'prescriptions';

const TAB_LABELS: Record<Tab, { fr: string; en: string }> = {
  orders: { fr: 'Commandes', en: 'Orders' },
  catalog: { fr: 'Catalogue', en: 'Catalog' },
  promotions: { fr: 'Codes promo', en: 'Promo codes' },
  banners: { fr: 'Bannières', en: 'Banners' },
  reviews: { fr: 'Avis', en: 'Reviews' },
  prescriptions: { fr: 'Ordonnances', en: 'Prescriptions' },
};

export default function AdminPage() {
  const { lang, showToast } = useApp();
  const { user, loading: authLoading, isAdmin } = useAuth();

  const [tab, setTab] = useState<Tab>('orders');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<{ fr: string; en: string }[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [csvOpen, setCsvOpen] = useState(false);

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRequest[]>([]);

  // `undefined` = pas de modale ; `null` = modale en création.
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null | undefined>(undefined);
  const [editingPromo, setEditingPromo] = useState<Promotion | null | undefined>(undefined);
  const [editingBanner, setEditingBanner] = useState<Banner | null | undefined>(undefined);

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
          const res = await apiFetch<{ items: AdminOrder[] }>(`/orders/admin?${query}`, {
            auth: true,
          });
          setOrders(res.items);
          break;
        }
        case 'catalog': {
          const [list, cats] = await Promise.all([
            apiFetch<AdminProduct[]>('/products/admin', { auth: true }),
            apiFetch<{ fr: string; en: string }[]>('/products/admin/categories', { auth: true }),
          ]);
          setProducts(list);
          setCategories(cats);
          break;
        }
        case 'promotions':
          setPromotions(await apiFetch<Promotion[]>('/promotions', { auth: true }));
          break;
        case 'banners':
          setBanners(await apiFetch<Banner[]>('/banners/admin', { auth: true }));
          break;
        case 'reviews':
          setReviews(await apiFetch<Review[]>('/reviews/pending', { auth: true }));
          break;
        case 'prescriptions':
          setPrescriptions(await apiFetch<PrescriptionRequest[]>('/prescriptions', { auth: true }));
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

  const act = async (fn: () => Promise<unknown>, successMessage: string) => {
    try {
      await fn();
      showToast(successMessage);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Erreur');
    }
  };

  /**
   * Le document d'ordonnance est protégé par le jeton : un `<a href>` simple
   * n'enverrait pas l'en-tête Authorization.
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
      showToast('Document indisponible.');
    }
  };

  const visibleProducts = useMemo(() => {
    const needle = catalogSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (!showInactive && !p.actif) return false;
      if (!needle) return true;
      return (
        p.id.includes(needle) ||
        p.name.fr.toLowerCase().includes(needle) ||
        p.cat.fr.toLowerCase().includes(needle)
      );
    });
  }, [products, catalogSearch, showInactive]);

  const bannerStatus = (b: Banner): { label: string; tone: string } => {
    if (!b.active) return { label: 'Désactivée', tone: 'off' };
    const now = Date.now();
    if (b.startsAt && new Date(b.startsAt).getTime() > now) {
      return {
        label: `Programmée — ${new Date(b.startsAt).toLocaleString('fr-FR')}`,
        tone: 'scheduled',
      };
    }
    if (b.endsAt && new Date(b.endsAt).getTime() < now) return { label: 'Terminée', tone: 'off' };
    return { label: 'En ligne', tone: 'live' };
  };

  // ------------------------------------------------------------- Accès

  if (authLoading) {
    return <p style={{ marginTop: 32, color: 'var(--ink-soft)' }}>Chargement…</p>;
  }

  // L'autorisation réelle est appliquée par l'API sur chaque requête ;
  // ce garde-fou évite seulement d'afficher une coquille vide.
  if (!user || !isAdmin) {
    return (
      <div style={{ marginTop: 32 }}>
        <div className="alert alert-warn">Cette page est réservée aux administrateurs.</div>
        <Link href={'/account' as any} className="btn btn-primary" style={{ marginTop: 12 }}>
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>Back-office</h1>
        <span className="cart-line-meta">{user.email}</span>
      </div>

      <nav className="admin-tabs">
        {(Object.keys(TAB_LABELS) as Tab[]).map((key) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {TAB_LABELS[key][lang]}
          </button>
        ))}
      </nav>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p style={{ color: 'var(--ink-soft)' }}>Chargement…</p>}

      {/* ------------------------------------------------------ Commandes */}
      {tab === 'orders' && !loading && (
        <>
          <div className="filters">
            <div className="search-box">
              🔎
              <input
                type="search"
                placeholder="N° commande, nom ou téléphone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tous les statuts</option>
              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s][lang]}
                </option>
              ))}
            </select>
          </div>

          {orders.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>Aucune commande.</p>
          ) : (
            <div className="order-list">
              {orders.map((o) => (
                <div className="order-card" key={o.id}>
                  <div className="order-card-head">
                    <strong>{o.id}</strong>
                    <span className={`status-pill status-${o.status}`}>
                      {ORDER_STATUS_LABELS[o.status][lang]}
                    </span>
                    <span className="badge">{PAYMENT_STATUS_LABELS[o.paymentStatus]?.[lang]}</span>
                  </div>

                  <span className="cart-line-meta">
                    {o.client} · {o.phone} ·{' '}
                    {o.mode_reception === 'retrait' ? 'Retrait' : 'Livraison'} · {o.address}
                    {o.point_repere_client ? ` (${o.point_repere_client})` : ''}
                  </span>
                  <span className="cart-line-meta">
                    {o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                  </span>
                  {o.code_retrait && (
                    <span className="badge">
                      Code : <code>{o.code_retrait}</code>
                    </span>
                  )}

                  {o.requiresPrescription && (
                    <div className={`alert ${o.prescriptionVerified ? 'alert-info' : 'alert-warn'}`}>
                      {o.prescriptionVerified
                        ? '✓ Ordonnance vérifiée'
                        : '⚠️ Ordonnance à vérifier avant confirmation'}
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
                              'Ordonnance vérifiée.',
                            )
                          }
                        >
                          Marquer vérifiée
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
        <>
          <div className="filters">
            <div className="search-box">
              🔎
              <input
                type="search"
                placeholder="Nom, identifiant ou catégorie…"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
            </div>
            <label className="checkbox-row" style={{ fontSize: 13 }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Afficher les désactivés
            </label>
            <button className="btn btn-ghost" onClick={() => setCsvOpen((v) => !v)}>
              {csvOpen ? 'Masquer' : 'Import / export CSV'}
            </button>
            <button className="btn btn-dark" onClick={() => setEditingProduct(null)}>
              ＋ Nouveau produit
            </button>
          </div>

          {csvOpen && <CsvPanel onImported={load} notify={showToast} />}

          <p className="cart-line-meta" style={{ marginBottom: 8 }}>
            {visibleProducts.length} produit(s) sur {products.length}
          </p>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th>Prix</th>
                  <th>Avis</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((p) => (
                  <tr key={p.id} className={p.actif ? '' : 'row-muted'}>
                    <td>
                      <div className="thumb">
                        {p.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`${API_URL.replace(/\/api$/, '')}${p.images[0]}`} alt="" />
                        ) : (
                          <span>✚</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <strong>{p.name.fr}</strong>
                      <br />
                      <code className="cart-line-meta">{p.id}</code>
                      {p.necessite_ordonnance && <span className="badge">📋 ordonnance</span>}
                      {!p.livraison_autorisee && <span className="badge">🏪 retrait</span>}
                      {p.necessite_chaine_froid && <span className="badge">❄️ froid</span>}
                    </td>
                    <td>{p.cat.fr}</td>
                    <td>
                      {formatFcfa(p.price)}
                      {p.oldPrice && p.oldPrice > p.price && (
                        <>
                          <br />
                          <s className="cart-line-meta">{formatFcfa(p.oldPrice)}</s>
                        </>
                      )}
                    </td>
                    <td>
                      {p.reviews > 0 ? `${p.rating.toFixed(1)} ★ (${p.reviews})` : '—'}
                    </td>
                    <td>{p.actif ? 'Actif' : 'Désactivé'}</td>
                    <td className="row-actions">
                      <button className="link" onClick={() => setEditingProduct(p)}>
                        Modifier
                      </button>
                      {p.actif ? (
                        <button
                          className="link-danger"
                          onClick={() =>
                            act(
                              () => apiFetch(`/products/${p.id}`, { method: 'DELETE', auth: true }),
                              `${p.name.fr} retiré du catalogue.`,
                            )
                          }
                        >
                          Désactiver
                        </button>
                      ) : (
                        <>
                          <button
                            className="link"
                            onClick={() =>
                              act(
                                () =>
                                  apiFetch(`/products/${p.id}/reactivate`, {
                                    method: 'PATCH',
                                    auth: true,
                                  }),
                                `${p.name.fr} remis en vente.`,
                              )
                            }
                          >
                            Réactiver
                          </button>
                          <button
                            className="link-danger"
                            onClick={() => {
                              if (
                                confirm(
                                  `Supprimer définitivement « ${p.name.fr} » ? Cette action est irréversible et n’est possible que si le produit n’a jamais été commandé.`,
                                )
                              ) {
                                act(
                                  () =>
                                    apiFetch(`/products/${p.id}/permanent`, {
                                      method: 'DELETE',
                                      auth: true,
                                    }),
                                  `${p.name.fr} supprimé.`,
                                );
                              }
                            }}
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ------------------------------------------------------ Promotions */}
      {tab === 'promotions' && !loading && (
        <>
          <div className="filters">
            <button className="btn btn-dark" onClick={() => setEditingPromo(null)}>
              ＋ Nouveau code promo
            </button>
          </div>

          {promotions.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>Aucun code promo.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Remise</th>
                    <th>Conditions</th>
                    <th>Période</th>
                    <th>Utilisations</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((p) => (
                    <tr key={p.id} className={p.active ? '' : 'row-muted'}>
                      <td>
                        <code>{p.code}</code>
                      </td>
                      <td>
                        {p.type === 'percent'
                          ? `−${p.value} %`
                          : p.type === 'fixed'
                            ? `−${formatFcfa(p.value)}`
                            : 'Livraison offerte'}
                        {p.maxDiscount > 0 && (
                          <>
                            <br />
                            <span className="cart-line-meta">max {formatFcfa(p.maxDiscount)}</span>
                          </>
                        )}
                      </td>
                      <td>
                        {p.minAmount > 0 ? `dès ${formatFcfa(p.minAmount)}` : 'sans minimum'}
                        <br />
                        <span className="cart-line-meta">
                          {p.maxPerCustomer > 0
                            ? `${p.maxPerCustomer}× par client`
                            : 'sans compte requis'}
                        </span>
                      </td>
                      <td className="cart-line-meta">
                        {p.startsAt ? new Date(p.startsAt).toLocaleDateString('fr-FR') : '—'}
                        {' → '}
                        {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('fr-FR') : '∞'}
                      </td>
                      <td>
                        {p.redemptions}
                        {p.maxRedemptions ? ` / ${p.maxRedemptions}` : ''}
                      </td>
                      <td>{p.active ? 'Actif' : 'Suspendu'}</td>
                      <td className="row-actions">
                        <button className="link" onClick={() => setEditingPromo(p)}>
                          Modifier
                        </button>
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
                                `${p.code} suspendu.`,
                              )
                            }
                          >
                            Suspendre
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

      {/* -------------------------------------------------------- Bannières */}
      {tab === 'banners' && !loading && (
        <>
          <div className="filters">
            <button className="btn btn-dark" onClick={() => setEditingBanner(null)}>
              ＋ Nouvelle bannière
            </button>
          </div>

          <p className="cart-line-meta" style={{ marginBottom: 12 }}>
            Les bannières s’affichent automatiquement pendant leur période de diffusion. Aucune
            intervention n’est nécessaire pour les retirer à la date de fin.
          </p>

          {banners.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>
              Aucune bannière. Le bandeau du site affiche alors ses messages par défaut.
            </p>
          ) : (
            <div className="banner-list">
              {banners.map((b) => {
                const status = bannerStatus(b);
                const placement = BANNER_PLACEMENTS.find((p) => p.value === b.placement);
                return (
                  <div className={`banner-card tone-${status.tone}`} key={b.id}>
                    <div className="banner-card-head">
                      <strong>{b.name}</strong>
                      <span className={`status-pill banner-${status.tone}`}>{status.label}</span>
                      <span className="badge">{placement?.fr ?? b.placement}</span>
                      {b.priority > 0 && <span className="badge">priorité {b.priority}</span>}
                    </div>

                    <div
                      className={b.placement === 'top_strip' ? 'preview-strip' : 'preview-hero'}
                      style={{
                        background: b.backgroundColor || 'var(--forest)',
                        color: b.textColor || '#fff',
                      }}
                    >
                      {b.placement === 'top_strip' ? (
                        <>
                          <span className="cross" style={{ width: 11, height: 11 }} />
                          {b.title.fr}
                        </>
                      ) : (
                        <>
                          <strong>{b.title.fr}</strong>
                          {b.subtitle && <span>{b.subtitle.fr}</span>}
                          {b.ctaLabel && (
                            <span
                              className="preview-cta"
                              style={{ color: b.backgroundColor || 'var(--forest)' }}
                            >
                              {b.ctaLabel.fr}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <span className="cart-line-meta">
                      {b.startsAt
                        ? `Du ${new Date(b.startsAt).toLocaleString('fr-FR')}`
                        : 'Sans date de début'}
                      {' · '}
                      {b.endsAt
                        ? `jusqu’au ${new Date(b.endsAt).toLocaleString('fr-FR')}`
                        : 'sans date de fin'}
                    </span>

                    <div className="order-card-foot">
                      <button className="link" onClick={() => setEditingBanner(b)}>
                        Modifier
                      </button>
                      <button
                        className="link"
                        onClick={() =>
                          act(
                            () => apiFetch(`/banners/${b.id}/toggle`, { method: 'PATCH', auth: true }),
                            b.active ? `« ${b.name} » désactivée.` : `« ${b.name} » activée.`,
                          )
                        }
                      >
                        {b.active ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        className="link-danger"
                        onClick={() => {
                          if (confirm(`Supprimer la bannière « ${b.name} » ?`)) {
                            act(
                              () => apiFetch(`/banners/${b.id}`, { method: 'DELETE', auth: true }),
                              `« ${b.name} » supprimée.`,
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
        </>
      )}

      {/* ------------------------------------------------------------ Avis */}
      {tab === 'reviews' && !loading && (
        <>
          {reviews.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>Aucun avis en attente de modération.</p>
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
                          'Avis publié.',
                        )
                      }
                    >
                      Publier
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
                          'Avis rejeté.',
                        )
                      }
                    >
                      Rejeter
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
            <p style={{ color: 'var(--ink-soft)' }}>Aucune demande de devis.</p>
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
                    {new Date(p.createdAt).toLocaleString('fr-FR')}
                  </span>
                  {p.note && <p>{p.note}</p>}
                  <div className="order-card-foot">
                    <button className="link" onClick={() => openPrescriptionFile(p.id)}>
                      Voir le document →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ---------------------------------------------------------- Modales */}
      {editingProduct !== undefined && (
        <ProductForm
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(undefined)}
          onSaved={load}
          notify={showToast}
        />
      )}

      {editingPromo !== undefined && (
        <PromotionForm
          promotion={editingPromo}
          onClose={() => setEditingPromo(undefined)}
          onSaved={load}
          notify={showToast}
        />
      )}

      {editingBanner !== undefined && (
        <BannerForm
          banner={editingBanner}
          onClose={() => setEditingBanner(undefined)}
          onSaved={load}
          notify={showToast}
        />
      )}
    </>
  );
}
