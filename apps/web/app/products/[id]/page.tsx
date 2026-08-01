'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatFcfa, useApp } from '../../context/AppContext';
import { flagLabel, ProductMedia } from '../../components/ProductCard';
import ProductReviews from '../../components/ProductReviews';

export default function ProductDetailPage() {
  const params = useParams();
  const { lang, findProduct, productsLoading, productsError, addToCart, deliveryRules } = useApp();

  const productId = params?.id as string;
  const p = findProduct(productId);

  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [qty, setQty] = useState<number>(1);

  // Les variantes ne sont connues qu'une fois le produit chargé.
  useEffect(() => {
    setSelectedColor(p?.variants?.color?.[0]);
    setSelectedSize(p?.variants?.size?.[0]);
    setQty(1);
  }, [p?.id]);

  const t = {
    fr: {
      navShop: 'Boutique',
      pdColor: 'Couleur',
      pdSize: 'Taille',
      pdDelay: 'Délai de livraison estimé',
      pdWarranty: 'Garantie retour 48h en cas de défaut',
      qty: 'Quantité',
      addCartBtn: 'Ajouter au panier — ',
      loading: 'Chargement du produit…',
      notFound: "Ce produit n'existe pas ou n'est plus disponible.",
      backToCatalog: 'Retour au catalogue',
      pickupOnly:
        'Ce produit ne peut pas être livré : il doit être retiré dans l’une de nos boutiques.',
      prescription:
        'Produit soumis à ordonnance : une pièce justificative vous sera demandée avant expédition.',
      coldChain: 'Produit thermosensible : expédié en emballage réfrigéré.',
    },
    en: {
      navShop: 'Shop',
      pdColor: 'Color',
      pdSize: 'Size',
      pdDelay: 'Estimated delivery delay',
      pdWarranty: '48h return warranty on defects',
      qty: 'Quantity',
      addCartBtn: 'Add to cart — ',
      loading: 'Loading product…',
      notFound: 'This product does not exist or is no longer available.',
      backToCatalog: 'Back to catalog',
      pickupOnly: 'This product cannot be delivered: it must be picked up in one of our stores.',
      prescription: 'Prescription-only product: proof will be requested before shipping.',
      coldChain: 'Temperature-sensitive product: shipped in refrigerated packaging.',
    },
  }[lang];

  if (productsLoading) {
    return <p style={{ marginTop: 32, color: 'var(--ink-soft)' }}>{t.loading}</p>;
  }

  if (productsError) {
    return (
      <div className="alert alert-error" style={{ marginTop: 32 }}>
        {productsError}
      </div>
    );
  }

  // Aucun repli sur un autre produit : afficher le mauvais article serait pire
  // que d'annoncer honnêtement que celui-ci n'existe pas.
  if (!p) {
    return (
      <div style={{ marginTop: 32 }}>
        <p>{t.notFound}</p>
        <Link href="/catalog" className="btn btn-primary" style={{ marginTop: 12 }}>
          {t.backToCatalog}
        </Link>
      </div>
    );
  }

  const roundedRating = Math.round(p.rating || 0);
  const stars = '★'.repeat(roundedRating) + '☆'.repeat(Math.max(0, 5 - roundedRating));
  const pickupOnly = p.livraison_autorisee === false;

  const francoLine =
    deliveryRules && deliveryRules.seuil_franco > 0
      ? lang === 'fr'
        ? `Livraison offerte dès ${formatFcfa(deliveryRules.seuil_franco)}`
        : `Free delivery from ${formatFcfa(deliveryRules.seuil_franco)}`
      : null;

  return (
    <>
      <div className="breadcrumb">
        <Link href="/catalog">{t.navShop}</Link> / {p.cat?.[lang]} / {p.name?.[lang]}
      </div>

      <div className="pd">
        <div className="pd-media">
          <ProductMedia product={p} />
        </div>
        <div>
          <span className="cat">{p.cat?.[lang]}</span>
          <h1>{p.name?.[lang]}</h1>
          <span className="stars">
            {stars} <span style={{ color: 'var(--ink-soft)' }}>({p.reviews || 0})</span>
          </span>

          <div className="pd-price">
            <span className="price">{formatFcfa(p.price)}</span>
            {p.oldPrice && p.oldPrice > p.price && (
              <span className="price-old">{formatFcfa(p.oldPrice)}</span>
            )}
          </div>

          <div className="badge-row">
            {(p.flags || []).map((f) => (
              <span key={f} className="badge">
                {flagLabel(f, lang)}
              </span>
            ))}
          </div>

          <p className="pd-desc">{p.desc?.[lang]}</p>

          {pickupOnly && <div className="alert alert-warn">🏪 {t.pickupOnly}</div>}
          {p.necessite_ordonnance && <div className="alert alert-warn">📋 {t.prescription}</div>}
          {p.necessite_chaine_froid && <div className="alert alert-info">❄️ {t.coldChain}</div>}

          {p.variants?.color && (
            <div className="variant-group">
              <label className="title">{t.pdColor}</label>
              <div className="swatches">
                {p.variants.color.map((c) => (
                  <button
                    key={c}
                    className={`swatch ${selectedColor === c ? 'active' : ''}`}
                    onClick={() => setSelectedColor(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {p.variants?.size && (
            <div className="variant-group">
              <label className="title">{t.pdSize}</label>
              <div className="swatches">
                {p.variants.size.map((s) => (
                  <button
                    key={s}
                    className={`swatch ${selectedSize === s ? 'active' : ''}`}
                    onClick={() => setSelectedSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pd-info-box">
            <div className="row">
              ⏱ <strong>{t.pdDelay} :</strong> {p.delay}
            </div>
            <div className="row">✚ {t.pdWarranty}</div>
            {francoLine && !pickupOnly && <div className="row">🚚 {francoLine}</div>}
          </div>

          <div className="qty-row">
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t.qty}</span>
            <div className="qty-stepper">
              <button onClick={() => setQty((prev) => Math.max(1, prev - 1))} aria-label="-">
                −
              </button>
              <span>{qty}</span>
              <button onClick={() => setQty((prev) => Math.min(99, prev + 1))} aria-label="+">
                +
              </button>
            </div>
          </div>

          <button
            className="btn btn-dark btn-block"
            onClick={() => addToCart(p.id, selectedColor, selectedSize, qty)}
          >
            {t.addCartBtn}
            {formatFcfa(p.price * qty)}
          </button>
        </div>
      </div>

      <ProductReviews productId={p.id} />
    </>
  );
}
