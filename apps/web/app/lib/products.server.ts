import 'server-only';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export type ServerProduct = {
  id: string;
  slug?: string;
  cat: { fr: string; en: string };
  name: { fr: string; en: string };
  desc: { fr: string; en: string };
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  images?: string[];
  delay: string;
  livraison_autorisee?: boolean;
};

/**
 * Lecture serveur du catalogue, utilisée pour générer les métadonnées et le
 * HTML indexable des fiches produit. Le rendu client, lui, passe par
 * AppContext : les deux consomment la même API.
 */
export async function fetchProduct(idOrSlug: string): Promise<ServerProduct | null> {
  try {
    const res = await fetch(`${API_URL}/products/${encodeURIComponent(idOrSlug)}`, {
      // Le catalogue change rarement : une revalidation horaire évite de
      // frapper l'API à chaque visite tout en gardant les prix à jour.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ServerProduct;
  } catch {
    // API injoignable au rendu : la page bascule sur le chargement client
    // plutôt que d'échouer complètement.
    return null;
  }
}

export type CampaignPage = {
  slug: string;
  title: { fr: string; en: string };
  subtitle?: { fr: string; en: string };
  paragraphs: { fr: string; en: string }[];
  seoDescription?: { fr: string; en: string };
  promotionCode?: string;
  heroImageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  products: ServerProduct[];
};

/**
 * Page de campagne publiée. `null` si elle n'existe pas ou n'est plus diffusée.
 *
 * Volontairement non mise en cache, contrairement aux fiches produit : une
 * campagne est définie par sa fenêtre de diffusion, et l'administrateur
 * s'attend à ce qu'une dépublication prenne effet immédiatement. Un cache,
 * même court, laisserait en ligne une page qu'on vient de retirer.
 */
export async function fetchCampaignPage(slug: string): Promise<CampaignPage | null> {
  try {
    const res = await fetch(`${API_URL}/campaign-pages/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as CampaignPage;
  } catch {
    return null;
  }
}

export async function fetchCampaignSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/campaign-pages/live`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as string[];
  } catch {
    return [];
  }
}

export async function fetchProducts(): Promise<ServerProduct[]> {
  try {
    const res = await fetch(`${API_URL}/products`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()) as ServerProduct[];
  } catch {
    return [];
  }
}
