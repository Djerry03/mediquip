'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { formatFcfa, useApp } from '../context/AppContext';
import { ProductMedia } from '../components/ProductCard';
import Banner from '../components/Banner';

export default function CartPage() {
  const { lang, cart, updateQty, removeFromCart, findProduct, productsLoading, deliveryRules } =
    useApp();

  const t = {
    fr: {
      title: 'Votre panier',
      empty: 'Votre panier est vide.',
      browse: 'Parcourir la boutique',
      loading: 'Chargement…',
      unit: 'Prix unitaire',
      subtotal: 'Sous-total articles',
      shippingNote: 'Les frais de livraison sont calculés à l’étape suivante.',
      checkout: 'Passer commande',
      remove: 'Retirer',
      continue: 'Continuer mes achats',
      pickupOnly: 'Retrait en boutique uniquement',
      unavailable: 'Ce produit n’est plus disponible et sera retiré de votre panier.',
      francoLeft: (n: string) => `Plus que ${n} pour la livraison offerte.`,
      francoOk: 'Livraison offerte : seuil atteint 🎉',
    },
    en: {
      title: 'Your cart',
      empty: 'Your cart is empty.',
      browse: 'Browse the shop',
      loading: 'Loading…',
      unit: 'Unit price',
      subtotal: 'Items subtotal',
      shippingNote: 'Delivery fees are calculated at the next step.',
      checkout: 'Checkout',
      remove: 'Remove',
      continue: 'Continue shopping',
      pickupOnly: 'In-store pickup only',
      unavailable: 'This product is no longer available and will be removed from your cart.',
      francoLeft: (n: string) => `${n} away from free delivery.`,
      francoOk: 'Free delivery unlocked 🎉',
    },
  }[lang];

  const lines = useMemo(
    () => cart.map((item, index) => ({ item, index, product: findProduct(item.productId) })),
    [cart, findProduct],
  );

  const subtotal = lines.reduce(
    (sum, l) => sum + (l.product ? l.product.price * l.item.qty : 0),
    0,
  );

  const francoLeft =
    deliveryRules && deliveryRules.seuil_franco > 0
      ? Math.max(0, deliveryRules.seuil_franco - subtotal)
      : null;

  if (productsLoading) {
    return <p style={{ marginTop: 32, color: 'var(--ink-soft)' }}>{t.loading}</p>;
  }

  if (cart.length === 0) {
    return (
      <>
        <div className="page-header">
          <h1>{t.title}</h1>
        </div>
        <p style={{ color: 'var(--ink-soft)' }}>{t.empty}</p>
        <Link href="/catalog" className="btn btn-primary" style={{ marginTop: 16 }}>
          {t.browse}
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>{t.title}</h1>
      </div>

      <div className="cart-layout">
        <div className="cart-lines">
          {lines.map(({ item, index, product }) => (
            <div className="cart-line" key={`${item.productId}-${item.color}-${item.size}-${index}`}>
              <div className="cart-line-media">
                {product ? <ProductMedia product={product} className="cart-line-media" /> : '✚'}
              </div>

              <div className="cart-line-body">
                {product ? (
                  <>
                    <Link href={`/products/${product.slug || product.id}` as any}>
                      <strong>{product.name?.[lang]}</strong>
                    </Link>
                    <span className="cart-line-meta">
                      {[item.color, item.size].filter(Boolean).join(' · ')}
                    </span>
                    <span className="cart-line-meta">
                      {t.unit} : {formatFcfa(product.price)}
                    </span>
                    {product.livraison_autorisee === false && (
                      <span className="badge">🏪 {t.pickupOnly}</span>
                    )}
                  </>
                ) : (
                  <div className="alert alert-warn">{t.unavailable}</div>
                )}
              </div>

              <div className="cart-line-actions">
                <div className="qty-stepper">
                  <button onClick={() => updateQty(index, item.qty - 1)} aria-label="-">
                    −
                  </button>
                  <span>{item.qty}</span>
                  <button onClick={() => updateQty(index, Math.min(99, item.qty + 1))} aria-label="+">
                    +
                  </button>
                </div>
                <strong>{product ? formatFcfa(product.price * item.qty) : '—'}</strong>
                <button className="link-danger" onClick={() => removeFromCart(index)}>
                  {t.remove}
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className="cart-summary">
          <Banner placement="cart_notice" />

          <div className="summary-row">
            <span>{t.subtotal}</span>
            <strong>{formatFcfa(subtotal)}</strong>
          </div>

          {francoLeft !== null && (
            <p className={francoLeft === 0 ? 'franco-ok' : 'franco-left'}>
              {francoLeft === 0 ? t.francoOk : t.francoLeft(formatFcfa(francoLeft))}
            </p>
          )}

          <p className="cart-note">{t.shippingNote}</p>

          <Link href="/checkout" className="btn btn-dark btn-block">
            {t.checkout}
          </Link>
          <Link href="/catalog" className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>
            {t.continue}
          </Link>
        </aside>
      </div>
    </>
  );
}
