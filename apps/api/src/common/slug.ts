/**
 * Transforme un libellé en identifiant d'URL : minuscules, sans accents,
 * séparé par des tirets. Utilisé pour les quartiers et les produits.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalisation agressive pour la recherche : supprime accents,
 * espaces et ponctuation afin que « Ngoa-Ekellé » et « ngoa ekelle »
 * se comparent à l'identique.
 */
export function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}
