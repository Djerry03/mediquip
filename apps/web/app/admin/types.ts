import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../lib/order-status';

export type Localized = { fr: string; en: string };

export type AdminProduct = {
  id: string;
  slug?: string;
  cat: Localized;
  name: Localized;
  desc: Localized;
  price: number;
  oldPrice?: number | null;
  flags: string[];
  delay: string;
  rating: number;
  reviews: number;
  images: string[];
  variants?: Record<string, string[]>;
  poids_kg: number;
  est_fragile: boolean;
  necessite_chaine_froid: boolean;
  livraison_autorisee: boolean;
  necessite_ordonnance: boolean;
  actif: boolean;
};

export type StockLine = {
  boutique_id: string;
  boutique_nom: string;
  gere_chaine_froid: boolean;
  quantite: number;
};

export type ImportReport = {
  crees: number;
  misAJour: number;
  ignores: number;
  erreurs: { ligne: number; message: string }[];
};

export type AdminOrder = {
  id: string;
  client: string;
  phone: string;
  address: string;
  total: number;
  status: keyof typeof ORDER_STATUS_LABELS;
  paymentStatus: keyof typeof PAYMENT_STATUS_LABELS;
  mode_reception: 'livraison' | 'retrait';
  code_retrait?: string;
  point_repere_client?: string;
  requiresPrescription: boolean;
  prescriptionVerified: boolean;
  createdAt: string;
  items: { name: string; qty: number }[];
};

export type PromotionType = 'percent' | 'fixed' | 'free_shipping';

export type Promotion = {
  id: string;
  code: string;
  type: PromotionType;
  value: number;
  minAmount: number;
  maxDiscount: number;
  maxRedemptions: number;
  redemptions: number;
  maxPerCustomer: number;
  startsAt?: string;
  expiresAt?: string;
  active: boolean;
};

export type BannerPlacement = 'top_strip' | 'home_hero' | 'catalog_top' | 'cart_notice';

export type Banner = {
  id: string;
  name: string;
  placement: BannerPlacement;
  title: Localized;
  subtitle?: Localized;
  ctaLabel?: Localized;
  ctaUrl?: string;
  imageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  startsAt?: string;
  endsAt?: string;
  priority: number;
  active: boolean;
};

export type Review = {
  id: string;
  productId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type PrescriptionRequest = {
  id: string;
  clientName: string;
  phone: string;
  email?: string;
  note?: string;
  status: string;
  createdAt: string;
};

/** Étiquettes produit disponibles — miroir de PRODUCT_FLAGS côté API. */
export const PRODUCT_FLAGS: { value: string; fr: string; en: string }[] = [
  { value: 'bestseller', fr: 'Best-seller', en: 'Bestseller' },
  { value: 'new', fr: 'Nouveauté', en: 'New' },
  { value: 'promo', fr: 'Promo', en: 'Sale' },
  { value: 'pack', fr: 'Pack', en: 'Pack' },
  { value: 'chaine-froid', fr: 'Chaîne du froid', en: 'Cold chain' },
  { value: 'retrait-uniquement', fr: 'Retrait boutique', en: 'Pickup only' },
  { value: 'ordonnance', fr: 'Sur ordonnance', en: 'Prescription' },
];

export const BANNER_PLACEMENTS: { value: BannerPlacement; fr: string; en: string; hint: string }[] =
  [
    {
      value: 'top_strip',
      fr: 'Bandeau haut de page',
      en: 'Top strip',
      hint: 'Ligne fine visible sur toutes les pages. Texte court.',
    },
    {
      value: 'home_hero',
      fr: 'Bannière accueil',
      en: 'Home hero',
      hint: "Grand encart en tête de la page d'accueil, avec bouton.",
    },
    {
      value: 'catalog_top',
      fr: 'Encart catalogue',
      en: 'Catalog notice',
      hint: 'Au-dessus de la grille produits.',
    },
    {
      value: 'cart_notice',
      fr: 'Encart panier',
      en: 'Cart notice',
      hint: 'Dans le récapitulatif du panier — utile pour relancer.',
    },
  ];
