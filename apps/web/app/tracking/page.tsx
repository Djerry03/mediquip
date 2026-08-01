'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatFcfa, useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch, ApiError } from '../lib/api';
import {
  ORDER_STATUS_LABELS,
  OrderStatus,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  TRACKING_STEPS,
} from '../lib/order-status';

type TrackedOrder = {
  id: string;
  client: string;
  total: number;
  itemsTotal: number;
  shippingFee: number;
  discount: number;
  status: OrderStatus;
  address?: string;
  mode_reception: 'livraison' | 'retrait';
  code_retrait?: string;
  paymentMethod: keyof typeof PAYMENT_METHOD_LABELS;
  paymentStatus: keyof typeof PAYMENT_STATUS_LABELS;
  items: { name: string; qty: number; lineTotal: number }[];
  createdAt: string;
  cancellationReason?: string;
};

function TrackingContent() {
  const params = useSearchParams();
  const { lang, showToast } = useApp();
  const { user } = useAuth();

  const [orderId, setOrderId] = useState('');
  const [token, setToken] = useState('');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const t = {
    fr: {
      title: 'Suivi de commande',
      sub: 'Saisissez votre numéro de commande. Si vous n’avez pas de compte, utilisez le lien de suivi reçu à la commande.',
      placeholder: 'MQ-260801-0001',
      check: 'Vérifier',
      searching: 'Recherche…',
      infoTitle: 'Détail de la commande',
      client: 'Client',
      total: 'Total',
      items: 'Articles',
      shipping: 'Livraison',
      discount: 'Remise',
      payment: 'Paiement',
      pickupCode: 'Code de retrait',
      address: 'Adresse',
      cancel: 'Annuler la commande',
      cancelling: 'Annulation…',
      cancelled: 'Commande annulée.',
      loginHint: 'Connectez-vous pour retrouver toutes vos commandes.',
      account: 'Mon compte',
      cancelReason: 'Motif',
    },
    en: {
      title: 'Order tracking',
      sub: 'Enter your order number. Without an account, use the tracking link received at checkout.',
      placeholder: 'MQ-260801-0001',
      check: 'Check',
      searching: 'Searching…',
      infoTitle: 'Order details',
      client: 'Customer',
      total: 'Total',
      items: 'Items',
      shipping: 'Delivery',
      discount: 'Discount',
      payment: 'Payment',
      pickupCode: 'Pickup code',
      address: 'Address',
      cancel: 'Cancel order',
      cancelling: 'Cancelling…',
      cancelled: 'Order cancelled.',
      loginHint: 'Sign in to find all your orders.',
      account: 'My account',
      cancelReason: 'Reason',
    },
  }[lang];

  const fetchOrder = useCallback(
    async (id: string, tok?: string) => {
      if (!id.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const query = tok ? `?token=${encodeURIComponent(tok)}` : '';
        setOrder(
          await apiFetch<TrackedOrder>(`/orders/${encodeURIComponent(id.trim())}${query}`, {
            auth: true,
          }),
        );
      } catch (err) {
        setOrder(null);
        setError(
          err instanceof ApiError
            ? err.message
            : 'Impossible de récupérer cette commande pour le moment.',
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Le lien envoyé par e-mail porte `id` et `token` : la recherche est automatique.
  useEffect(() => {
    const id = params.get('id');
    const tok = params.get('token');
    if (id) {
      setOrderId(id);
      setToken(tok || '');
      fetchOrder(id, tok || undefined);
    }
  }, [params, fetchOrder]);

  const cancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const updated = await apiFetch<TrackedOrder>(`/orders/${order.id}/cancel`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({}),
      });
      setOrder(updated);
      showToast(t.cancelled);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setCancelling(false);
    }
  };

  const currentStep = order ? TRACKING_STEPS.indexOf(order.status) : -1;
  const canCancel = order && user && ['pending', 'confirmed'].includes(order.status);

  return (
    <>
      <div className="page-header">
        <h1>{t.title}</h1>
      </div>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 18 }}>{t.sub}</p>

      <form
        className="tracking-form"
        onSubmit={(e) => {
          e.preventDefault();
          fetchOrder(orderId, token || undefined);
        }}
      >
        <input
          placeholder={t.placeholder}
          value={orderId}
          onChange={(e) => setOrderId(e.target.value.toUpperCase())}
          aria-label={t.title}
        />
        <button className="btn btn-dark" disabled={loading}>
          {loading ? t.searching : t.check}
        </button>
      </form>

      {!user && (
        <p className="cart-note">
          {t.loginHint}{' '}
          <Link href={'/account' as any} className="link">
            {t.account} →
          </Link>
        </p>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginTop: 18 }}>
          {error}
        </div>
      )}

      {order && (
        <section className="tracking-result">
          <div className="section-head">
            <h2 style={{ fontSize: 18 }}>{t.infoTitle}</h2>
            <span className={`status-pill status-${order.status}`}>
              {ORDER_STATUS_LABELS[order.status]?.[lang] ?? order.status}
            </span>
          </div>

          {order.status === 'cancelled' ? (
            <div className="alert alert-warn">
              {t.cancelReason} : {order.cancellationReason || '—'}
            </div>
          ) : (
            <ol className="tracking-steps">
              {TRACKING_STEPS.map((step, i) => (
                <li key={step} className={i <= currentStep ? 'done' : ''}>
                  <span className="dot" />
                  {ORDER_STATUS_LABELS[step][lang]}
                </li>
              ))}
            </ol>
          )}

          <dl className="tracking-facts">
            <div>
              <dt>{t.client}</dt>
              <dd>{order.client}</dd>
            </div>
            {order.address && (
              <div>
                <dt>{t.address}</dt>
                <dd>{order.address}</dd>
              </div>
            )}
            <div>
              <dt>{t.items}</dt>
              <dd>{formatFcfa(order.itemsTotal)}</dd>
            </div>
            <div>
              <dt>{t.shipping}</dt>
              <dd>{order.shippingFee > 0 ? formatFcfa(order.shippingFee) : '—'}</dd>
            </div>
            {order.discount > 0 && (
              <div>
                <dt>{t.discount}</dt>
                <dd>−{formatFcfa(order.discount)}</dd>
              </div>
            )}
            <div>
              <dt>{t.total}</dt>
              <dd>
                <strong>{formatFcfa(order.total)}</strong>
              </dd>
            </div>
            <div>
              <dt>{t.payment}</dt>
              <dd>
                {PAYMENT_METHOD_LABELS[order.paymentMethod]?.[lang]} —{' '}
                {PAYMENT_STATUS_LABELS[order.paymentStatus]?.[lang]}
              </dd>
            </div>
            {order.code_retrait && (
              <div>
                <dt>{t.pickupCode}</dt>
                <dd>
                  <code className="pickup-code">{order.code_retrait}</code>
                </dd>
              </div>
            )}
          </dl>

          <ul className="summary-items">
            {order.items.map((item, i) => (
              <li key={i}>
                <span>
                  {item.qty}× {item.name}
                </span>
                <span>{formatFcfa(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          {canCancel && (
            <button className="btn btn-ghost" onClick={cancel} disabled={cancelling}>
              {cancelling ? t.cancelling : t.cancel}
            </button>
          )}
        </section>
      )}
    </>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={<p style={{ marginTop: 32 }}>…</p>}>
      <TrackingContent />
    </Suspense>
  );
}
