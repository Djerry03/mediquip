'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { formatFcfa, useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch, ApiError } from '../lib/api';

type Quartier = {
  id: string;
  nom: string;
  zone_code: string | null;
  livraison_disponible: boolean;
};

type Boutique = {
  id: string;
  nom: string;
  quartier: string;
  point_repere: string;
  telephone: string;
  disponibilite: 'disponible' | 'partielle' | 'indisponible';
  items_disponibles: string;
  ouvert_maintenant: boolean;
  horaires_aujourdhui: string;
};

type Simulation = {
  mode: 'tarif' | 'devis' | 'retrait_obligatoire' | 'indisponible';
  frais: number | null;
  detail: { libelle: string; montant: number }[];
  franco_applique?: boolean;
  montant_restant_pour_franco?: number;
  boutique_expedition?: { id: string; nom: string };
  delai_estime?: string;
  message?: string | null;
};

type Discount = { code: string; discount: number; freeShipping: boolean; label: string };

type CreatedOrder = {
  id: string;
  trackingToken: string;
  total: number;
  code_retrait?: string;
  mode_reception: 'livraison' | 'retrait';
  delai_estime?: string;
  payment?: { instructions: string; requiresCustomerAction: boolean };
};

export default function CheckoutPage() {
  const { lang, cart, findProduct, productsLoading, clearCart, setLastOrder, deliveryRules } =
    useApp();
  const { user } = useAuth();

  const [mode, setMode] = useState<'livraison' | 'retrait'>('livraison');
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'mobile_money'>(
    'cash_on_delivery',
  );
  const [express, setExpress] = useState(false);

  const [form, setForm] = useState({
    clientName: '',
    phone: '',
    email: '',
    pointRepere: '',
    payerPhone: '',
    note: '',
  });

  const [quartierQuery, setQuartierQuery] = useState('');
  const [quartierResults, setQuartierResults] = useState<Quartier[]>([]);
  const [selectedQuartier, setSelectedQuartier] = useState<Quartier | null>(null);

  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState<string>('');

  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [simulating, setSimulating] = useState(false);

  const [promoInput, setPromoInput] = useState('');
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<CreatedOrder | null>(null);

  const t = {
    fr: {
      title: 'Finaliser ma commande',
      empty: 'Votre panier est vide.',
      browse: 'Parcourir la boutique',
      loading: 'Chargement…',
      recap: 'Récapitulatif',
      editCart: 'Modifier le panier',
      contact: 'Vos coordonnées',
      fullName: 'Nom complet',
      phone: 'Téléphone',
      emailLabel: 'E-mail (pour recevoir la confirmation)',
      reception: 'Mode de réception',
      delivery: 'Livraison à domicile',
      pickup: 'Retrait en boutique',
      quartier: 'Quartier de livraison',
      quartierPh: 'Tapez les 2 premières lettres…',
      landmark: 'Point de repère',
      landmarkPh: 'Ex. face à la pharmacie, portail bleu',
      expressLabel: 'Livraison express',
      chooseBoutique: 'Choisissez votre boutique',
      openNow: 'Ouvert',
      closedNow: 'Fermé',
      promo: 'Code promo',
      promoPh: 'MEDI10',
      apply: 'Appliquer',
      remove: 'Retirer',
      payment: 'Paiement',
      payCash: 'À la livraison / au retrait',
      payMomo: 'Mobile Money',
      payerPhone: 'Numéro Mobile Money',
      items: 'Articles',
      shipping: 'Livraison',
      discountLine: 'Remise',
      total: 'Total à payer',
      submit: 'Confirmer la commande',
      submitting: 'Envoi…',
      needQuartier: 'Sélectionnez un quartier dans la liste.',
      needBoutique: 'Sélectionnez une boutique de retrait.',
      simulating: 'Calcul des frais…',
      noDeliveryHere: 'Livraison indisponible pour ce quartier.',
      okTitle: 'Commande enregistrée',
      okNumber: 'Votre numéro de commande',
      okPickupCode: 'Code de retrait à présenter en boutique',
      okTrack: 'Suivre ma commande',
      okKeepLink: 'Conservez ce lien : il vous permet de suivre la commande sans compte.',
      okContinue: 'Continuer mes achats',
      deliveredIn: 'Délai estimé',
    },
    en: {
      title: 'Complete my order',
      empty: 'Your cart is empty.',
      browse: 'Browse the shop',
      loading: 'Loading…',
      recap: 'Summary',
      editCart: 'Edit cart',
      contact: 'Your details',
      fullName: 'Full name',
      phone: 'Phone',
      emailLabel: 'Email (to receive confirmation)',
      reception: 'Reception mode',
      delivery: 'Home delivery',
      pickup: 'In-store pickup',
      quartier: 'Delivery neighborhood',
      quartierPh: 'Type the first 2 letters…',
      landmark: 'Landmark',
      landmarkPh: 'E.g. facing the pharmacy, blue gate',
      expressLabel: 'Express delivery',
      chooseBoutique: 'Choose your store',
      openNow: 'Open',
      closedNow: 'Closed',
      promo: 'Promo code',
      promoPh: 'MEDI10',
      apply: 'Apply',
      remove: 'Remove',
      payment: 'Payment',
      payCash: 'On delivery / pickup',
      payMomo: 'Mobile Money',
      payerPhone: 'Mobile Money number',
      items: 'Items',
      shipping: 'Delivery',
      discountLine: 'Discount',
      total: 'Total to pay',
      submit: 'Confirm order',
      submitting: 'Sending…',
      needQuartier: 'Select a neighborhood from the list.',
      needBoutique: 'Select a pickup store.',
      simulating: 'Calculating fees…',
      noDeliveryHere: 'Delivery unavailable for this neighborhood.',
      okTitle: 'Order registered',
      okNumber: 'Your order number',
      okPickupCode: 'Pickup code to present in store',
      okTrack: 'Track my order',
      okKeepLink: 'Keep this link: it lets you track the order without an account.',
      okContinue: 'Continue shopping',
      deliveredIn: 'Estimated delay',
    },
  }[lang];

  // Pré-remplissage depuis le compte connecté.
  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      clientName: prev.clientName || user.fullName,
      phone: prev.phone || user.phone || '',
      email: prev.email || user.email,
      pointRepere: prev.pointRepere || user.defaultPointRepere || '',
    }));
  }, [user]);

  const lines = useMemo(
    () => cart.map((item) => ({ item, product: findProduct(item.productId) })),
    [cart, findProduct],
  );

  const itemsTotal = lines.reduce(
    (sum, l) => sum + (l.product ? l.product.price * l.item.qty : 0),
    0,
  );

  // Un seul article non livrable impose le retrait pour toute la commande.
  const pickupOnly = lines.some((l) => l.product?.livraison_autorisee === false);

  useEffect(() => {
    if (pickupOnly) setMode('retrait');
  }, [pickupOnly]);

  const panierParam = useMemo(
    () => cart.map((i) => `${i.productId}:${i.qty}`).join(','),
    [cart],
  );

  // -------------------------------------------------- Recherche de quartier
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (quartierQuery.trim().length < 2 || selectedQuartier) {
      setQuartierResults([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      try {
        setQuartierResults(
          await apiFetch<Quartier[]>(`/quartiers?q=${encodeURIComponent(quartierQuery)}`),
        );
      } catch {
        setQuartierResults([]);
      }
    }, 250);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [quartierQuery, selectedQuartier]);

  // --------------------------------------- Disponibilité pour le retrait
  useEffect(() => {
    if (mode !== 'retrait' || !panierParam) return;
    apiFetch<Boutique[]>(`/boutiques/disponibilite?produits=${panierParam}`)
      .then(setBoutiques)
      .catch(() => setBoutiques([]));
  }, [mode, panierParam]);

  // ------------------------------------------------ Simulation des frais
  const runSimulation = useCallback(async () => {
    if (mode !== 'livraison' || !selectedQuartier || cart.length === 0) {
      setSimulation(null);
      return;
    }

    setSimulating(true);
    try {
      setSimulation(
        await apiFetch<Simulation>('/livraison/simuler', {
          method: 'POST',
          body: JSON.stringify({
            quartier_id: selectedQuartier.id,
            panier: cart.map((i) => ({ produit_id: i.productId, quantite: i.qty })),
            express,
          }),
        }),
      );
    } catch (err) {
      setSimulation(null);
      setError(err instanceof ApiError ? err.message : null);
    } finally {
      setSimulating(false);
    }
  }, [mode, selectedQuartier, cart, express]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  // ------------------------------------------------------------ Totaux
  const shippingFee = mode === 'livraison' ? (simulation?.frais ?? 0) : 0;
  const effectiveShipping = discount?.freeShipping ? 0 : shippingFee;
  const discountAmount = discount?.freeShipping ? 0 : (discount?.discount ?? 0);
  const total = Math.max(0, itemsTotal + effectiveShipping - discountAmount);

  const applyPromo = async () => {
    setPromoError(null);
    try {
      setDiscount(
        await apiFetch<Discount>('/promotions/validate', {
          method: 'POST',
          auth: true,
          body: JSON.stringify({ code: promoInput, itemsTotal, shippingFee }),
        }),
      );
    } catch (err) {
      setDiscount(null);
      setPromoError(err instanceof ApiError ? err.message : 'Code invalide.');
    }
  };

  // ------------------------------------------------------------ Soumission
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'livraison' && !selectedQuartier) return setError(t.needQuartier);
    if (mode === 'retrait' && !selectedBoutiqueId) return setError(t.needBoutique);

    setSubmitting(true);
    try {
      const order = await apiFetch<CreatedOrder>('/orders', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          clientName: form.clientName,
          phone: form.phone,
          email: form.email || undefined,
          items: cart.map((i) => ({
            productId: i.productId,
            qty: i.qty,
            color: i.color,
            size: i.size,
          })),
          mode_reception: mode,
          quartier_id: mode === 'livraison' ? selectedQuartier!.id : undefined,
          point_repere_client: mode === 'livraison' ? form.pointRepere : undefined,
          boutique_id: mode === 'retrait' ? selectedBoutiqueId : undefined,
          paymentMethod,
          payerPhone: paymentMethod === 'mobile_money' ? form.payerPhone || form.phone : undefined,
          promotionCode: discount?.code,
          express: mode === 'livraison' ? express : undefined,
          note: form.note || undefined,
        }),
      });

      // Aucune commande n'est inventée côté client : ce bloc n'est atteint
      // que si l'API a réellement enregistré la commande.
      setConfirmed(order);
      setLastOrder({ id: order.id, trackingToken: order.trackingToken, total: order.total });
      clearCart();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'La commande n’a pas pu être enregistrée. Réessayez dans un instant.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------- Rendu
  if (confirmed) {
    const trackHref = `/tracking?id=${confirmed.id}&token=${confirmed.trackingToken}`;
    return (
      <div className="confirm-panel">
        <span className="confirm-check">✓</span>
        <h1>{t.okTitle}</h1>

        <p className="confirm-number">
          {t.okNumber} : <strong>{confirmed.id}</strong>
        </p>
        <p>{formatFcfa(confirmed.total)}</p>

        {confirmed.delai_estime && (
          <p className="cart-line-meta">
            {t.deliveredIn} : {confirmed.delai_estime}
          </p>
        )}

        {confirmed.code_retrait && (
          <div className="alert alert-info">
            {t.okPickupCode} : <code className="pickup-code">{confirmed.code_retrait}</code>
          </div>
        )}

        {confirmed.payment?.instructions && (
          <div className="alert alert-info">{confirmed.payment.instructions}</div>
        )}

        <p className="cart-note">{t.okKeepLink}</p>

        <div className="confirm-actions">
          <Link href={trackHref as any} className="btn btn-dark">
            {t.okTrack}
          </Link>
          <Link href="/catalog" className="btn btn-ghost">
            {t.okContinue}
          </Link>
        </div>
      </div>
    );
  }

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

      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-main">
          {/* ---- Coordonnées ---- */}
          <fieldset className="checkout-block">
            <legend>{t.contact}</legend>

            <label>
              {t.fullName}
              <input
                required
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
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
              {t.emailLabel}
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
            </label>
          </fieldset>

          {/* ---- Mode de réception ---- */}
          <fieldset className="checkout-block">
            <legend>{t.reception}</legend>

            <div className="mode-toggle">
              <button
                type="button"
                className={mode === 'livraison' ? 'active' : ''}
                disabled={pickupOnly}
                onClick={() => setMode('livraison')}
              >
                🚚 {t.delivery}
              </button>
              <button
                type="button"
                className={mode === 'retrait' ? 'active' : ''}
                onClick={() => setMode('retrait')}
              >
                🏪 {t.pickup}
              </button>
            </div>

            {pickupOnly && (
              <div className="alert alert-warn">
                {lang === 'fr'
                  ? 'Un article de votre panier ne peut pas être livré : la commande se fera en retrait boutique.'
                  : 'One item in your cart cannot be delivered: this order must be picked up in store.'}
              </div>
            )}

            {mode === 'livraison' ? (
              <>
                <label className="autocomplete">
                  {t.quartier}
                  <input
                    required
                    placeholder={t.quartierPh}
                    value={selectedQuartier ? selectedQuartier.nom : quartierQuery}
                    onChange={(e) => {
                      setSelectedQuartier(null);
                      setQuartierQuery(e.target.value);
                    }}
                    autoComplete="off"
                  />
                  {quartierResults.length > 0 && (
                    <ul className="autocomplete-list">
                      {quartierResults.map((q) => (
                        <li key={q.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuartier(q);
                              setQuartierQuery(q.nom);
                              setQuartierResults([]);
                            }}
                          >
                            {q.nom}
                            <span className="zone-tag">{q.zone_code}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </label>

                <label>
                  {t.landmark}
                  <input
                    required
                    placeholder={t.landmarkPh}
                    value={form.pointRepere}
                    onChange={(e) => setForm({ ...form, pointRepere: e.target.value })}
                  />
                </label>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={express}
                    onChange={(e) => setExpress(e.target.checked)}
                  />
                  {t.expressLabel}
                  {deliveryRules && ` (+${formatFcfa(deliveryRules.supplement_express)})`}
                </label>

                {simulation && simulation.mode !== 'tarif' && (
                  <div className="alert alert-warn">{simulation.message || t.noDeliveryHere}</div>
                )}
                {simulation?.message && simulation.mode === 'tarif' && (
                  <div className="alert alert-info">{simulation.message}</div>
                )}
              </>
            ) : (
              <div className="boutique-list">
                <span className="cart-line-meta">{t.chooseBoutique}</span>
                {boutiques.map((b) => (
                  <label
                    key={b.id}
                    className={`boutique-card ${selectedBoutiqueId === b.id ? 'active' : ''} ${
                      b.disponibilite === 'indisponible' ? 'disabled' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="boutique"
                      value={b.id}
                      checked={selectedBoutiqueId === b.id}
                      disabled={b.disponibilite === 'indisponible'}
                      onChange={() => setSelectedBoutiqueId(b.id)}
                    />
                    <div>
                      <strong>{b.nom}</strong>
                      <span className="cart-line-meta">{b.point_repere}</span>
                      <span className="cart-line-meta">
                        {b.ouvert_maintenant ? `🟢 ${t.openNow}` : `🔴 ${t.closedNow}`} ·{' '}
                        {b.horaires_aujourdhui} · {b.items_disponibles}{' '}
                        {lang === 'fr' ? 'article(s) en stock' : 'item(s) in stock'}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {/* ---- Paiement ---- */}
          <fieldset className="checkout-block">
            <legend>{t.payment}</legend>

            <div className="mode-toggle">
              <button
                type="button"
                className={paymentMethod === 'cash_on_delivery' ? 'active' : ''}
                onClick={() => setPaymentMethod('cash_on_delivery')}
              >
                💵 {t.payCash}
              </button>
              <button
                type="button"
                className={paymentMethod === 'mobile_money' ? 'active' : ''}
                onClick={() => setPaymentMethod('mobile_money')}
              >
                📱 {t.payMomo}
              </button>
            </div>

            {paymentMethod === 'mobile_money' && (
              <label>
                {t.payerPhone}
                <input
                  type="tel"
                  placeholder="6XX XX XX XX"
                  value={form.payerPhone}
                  onChange={(e) => setForm({ ...form, payerPhone: e.target.value })}
                />
              </label>
            )}
          </fieldset>
        </div>

        {/* ---- Récapitulatif ---- */}
        <aside className="checkout-summary">
          <div className="section-head">
            <h2 style={{ fontSize: 17 }}>{t.recap}</h2>
            <Link href={"/cart" as any} className="link">
              {t.editCart}
            </Link>
          </div>

          <ul className="summary-items">
            {lines.map(({ item, product }, i) => (
              <li key={i}>
                <span>
                  {item.qty}× {product?.name?.[lang] ?? item.productId}
                </span>
                <span>{product ? formatFcfa(product.price * item.qty) : '—'}</span>
              </li>
            ))}
          </ul>

          <div className="promo-row">
            {discount ? (
              <div className="promo-applied">
                <span>
                  ✓ {discount.code} — {discount.label}
                </span>
                <button
                  type="button"
                  className="link-danger"
                  onClick={() => {
                    setDiscount(null);
                    setPromoInput('');
                  }}
                >
                  {t.remove}
                </button>
              </div>
            ) : (
              <>
                <input
                  placeholder={t.promoPh}
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  aria-label={t.promo}
                />
                <button type="button" className="btn btn-outline" onClick={applyPromo}>
                  {t.apply}
                </button>
              </>
            )}
          </div>
          {promoError && <div className="alert alert-error">{promoError}</div>}

          <div className="summary-row">
            <span>{t.items}</span>
            <span>{formatFcfa(itemsTotal)}</span>
          </div>

          <div className="summary-row">
            <span>{t.shipping}</span>
            <span>
              {mode === 'retrait'
                ? '—'
                : simulating
                  ? t.simulating
                  : simulation?.mode === 'tarif'
                    ? formatFcfa(effectiveShipping)
                    : '—'}
            </span>
          </div>

          {mode === 'livraison' && !discount?.freeShipping && simulation?.detail?.length ? (
            <ul className="summary-detail">
              {simulation.detail.map((d, i) => (
                <li key={i}>
                  <span>{d.libelle}</span>
                  <span>{formatFcfa(d.montant)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {(discountAmount > 0 || discount?.freeShipping) && (
            <div className="summary-row discount">
              <span>{t.discountLine}</span>
              <span>
                −{formatFcfa(discount?.freeShipping ? shippingFee : discountAmount)}
              </span>
            </div>
          )}

          <div className="summary-row summary-total">
            <span>{t.total}</span>
            <strong>{formatFcfa(total)}</strong>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button
            className="btn btn-dark btn-block"
            disabled={
              submitting ||
              simulating ||
              (mode === 'livraison' && simulation?.mode !== 'tarif') ||
              (mode === 'retrait' && !selectedBoutiqueId)
            }
          >
            {submitting ? t.submitting : t.submit}
          </button>
        </aside>
      </form>
    </>
  );
}
