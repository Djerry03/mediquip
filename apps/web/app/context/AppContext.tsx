'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api';

export type Localized = { fr: string; en: string };

export type Product = {
  id: string;
  slug?: string;
  cat: Localized;
  name: Localized;
  /** Prix effectivement payé aujourd'hui. */
  price: number;
  /** Ancien prix barré, toujours supérieur à `price` quand il est défini. */
  oldPrice?: number;
  flags: string[];
  delay: string;
  rating: number;
  reviews: number;
  variants?: { color?: string[]; size?: string[] };
  desc: Localized;
  images?: string[];
  poids_kg?: number;
  est_fragile?: boolean;
  necessite_chaine_froid?: boolean;
  livraison_autorisee?: boolean;
  necessite_ordonnance?: boolean;
  actif?: boolean;
};

export type CartItem = {
  productId: string;
  qty: number;
  color?: string;
  size?: string;
};

/**
 * Règles de livraison — servies par l'API, jamais dupliquées en dur ici.
 * L'API reste l'unique source de vérité sur les prix et les seuils.
 */
export type DeliveryRules = {
  seuil_franco: number;
  poids_inclus_kg: number;
  prix_par_kg_supplementaire: number;
  supplement_fragile: number;
  supplement_chaine_froid: number;
  supplement_express: number;
  livraison_active: boolean;
};

type AppContextType = {
  lang: 'fr' | 'en';
  setLang: (lang: 'fr' | 'en') => void;

  cart: CartItem[];
  addToCart: (productId: string, color?: string, size?: string, qty?: number) => void;
  updateQty: (index: number, qty: number) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  cartCount: number;

  products: Product[];
  productsLoading: boolean;
  productsError: string | null;
  reloadProducts: () => Promise<void>;
  findProduct: (id: string) => Product | undefined;

  deliveryRules: DeliveryRules | null;

  toastMessage: string | null;
  showToast: (msg: string) => void;

  lastOrder: any;
  setLastOrder: (order: any) => void;
};

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'mediquip_state';

type PersistedState = {
  lang?: 'fr' | 'en';
  cart?: CartItem[];
  lastOrder?: any;
};

function readPersisted(): PersistedState {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function persist(patch: PersistedState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readPersisted(), ...patch }));
  } catch {
    /* stockage indisponible — l'app fonctionne, l'état n'est simplement pas conservé */
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<'fr' | 'en'>('fr');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastOrder, setLastOrderState] = useState<any>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [deliveryRules, setDeliveryRules] = useState<DeliveryRules | null>(null);

  useEffect(() => {
    const saved = readPersisted();
    if (saved.lang) setLangState(saved.lang);
    if (saved.cart) setCart(saved.cart);
    if (saved.lastOrder) setLastOrderState(saved.lastOrder);
  }, []);

  const reloadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const data = await apiFetch<Product[]>('/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Le catalogue est momentanément indisponible.';
      setProductsError(message);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadProducts();
  }, [reloadProducts]);

  useEffect(() => {
    apiFetch<DeliveryRules>('/livraison/regles')
      .then(setDeliveryRules)
      .catch(() => setDeliveryRules(null));
  }, []);

  const setLang = useCallback((l: 'fr' | 'en') => {
    setLangState(l);
    persist({ lang: l });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const addToCart = useCallback(
    (productId: string, color?: string, size?: string, qty: number = 1) => {
      setCart((prev) => {
        const idx = prev.findIndex(
          (item) => item.productId === productId && item.color === color && item.size === size,
        );
        const updated =
          idx >= 0
            ? prev.map((item, i) => (i === idx ? { ...item, qty: item.qty + qty } : item))
            : [...prev, { productId, color, size, qty }];
        persist({ cart: updated });
        return updated;
      });
      showToast(lang === 'fr' ? 'Ajouté au panier' : 'Added to cart');
    },
    [lang, showToast],
  );

  const updateQty = useCallback((index: number, qty: number) => {
    setCart((prev) => {
      const updated =
        qty <= 0
          ? prev.filter((_, i) => i !== index)
          : prev.map((item, i) => (i === index ? { ...item, qty } : item));
      persist({ cart: updated });
      return updated;
    });
  }, []);

  const removeFromCart = useCallback((index: number) => {
    setCart((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      persist({ cart: updated });
      return updated;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    persist({ cart: [] });
  }, []);

  const setLastOrder = useCallback((order: any) => {
    setLastOrderState(order);
    persist({ lastOrder: order });
  }, []);

  const findProduct = useCallback(
    (id: string) => products.find((p) => p.id === id || p.slug === id),
    [products],
  );

  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.qty, 0), [cart]);

  const value = useMemo<AppContextType>(
    () => ({
      lang,
      setLang,
      cart,
      addToCart,
      updateQty,
      removeFromCart,
      clearCart,
      cartCount,
      products,
      productsLoading,
      productsError,
      reloadProducts,
      findProduct,
      deliveryRules,
      toastMessage,
      showToast,
      lastOrder,
      setLastOrder,
    }),
    [
      lang,
      setLang,
      cart,
      addToCart,
      updateQty,
      removeFromCart,
      clearCart,
      cartCount,
      products,
      productsLoading,
      productsError,
      reloadProducts,
      findProduct,
      deliveryRules,
      toastMessage,
      showToast,
      lastOrder,
      setLastOrder,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

/** Formatage monétaire unique de l'application. */
export function formatFcfa(n: number): string {
  return `${Math.round(n || 0).toLocaleString('fr-FR').replace(/[\s,  ]/g, ' ')} FCFA`;
}
