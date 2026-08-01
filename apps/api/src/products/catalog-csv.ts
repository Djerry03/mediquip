import { BadRequestException } from '@nestjs/common';
import { ProductEntity } from '../entities/product.entity';
import { PRODUCT_FLAGS } from '../data/products.seed';

/**
 * Colonnes du fichier d'échange. L'ordre fait foi à l'export et sert
 * d'en-tête de référence à l'import.
 */
export const CSV_COLUMNS = [
  'id',
  'slug',
  'nom_fr',
  'nom_en',
  'categorie_fr',
  'categorie_en',
  'description_fr',
  'description_en',
  'prix',
  'prix_barre',
  'etiquettes',
  'delai',
  'poids_kg',
  'fragile',
  'chaine_froid',
  'livraison_autorisee',
  'ordonnance',
  'actif',
  'images',
] as const;

const BOOLEAN_TRUE = ['1', 'true', 'vrai', 'oui', 'yes', 'x'];

/** Échappement CSV : guillemets doublés, champ encadré si nécessaire. */
function escapeCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function productsToCsv(products: ProductEntity[]): string {
  const rows = products.map((p) =>
    [
      p.id,
      p.slug ?? '',
      p.name?.fr ?? '',
      p.name?.en ?? '',
      p.cat?.fr ?? '',
      p.cat?.en ?? '',
      p.desc?.fr ?? '',
      p.desc?.en ?? '',
      p.price,
      p.oldPrice ?? '',
      (p.flags ?? []).join('|'),
      p.delay ?? '',
      p.poids_kg ?? 0,
      p.est_fragile ? 1 : 0,
      p.necessite_chaine_froid ? 1 : 0,
      p.livraison_autorisee ? 1 : 0,
      p.necessite_ordonnance ? 1 : 0,
      p.actif ? 1 : 0,
      (p.images ?? []).join('|'),
    ]
      .map(escapeCell)
      .join(','),
  );

  // Le BOM UTF-8 évite qu'Excel affiche « Ã© » à la place de « é ».
  return '﻿' + [CSV_COLUMNS.join(','), ...rows].join('\r\n') + '\r\n';
}

/** Découpe une ligne CSV en respectant les champs entre guillemets. */
function splitCsvLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === separator) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

export type ParsedProductRow = {
  ligne: number;
  data: Partial<ProductEntity> & { id: string };
};

export type CsvParseResult = {
  rows: ParsedProductRow[];
  errors: { ligne: number; message: string }[];
};

/**
 * Analyse un CSV de catalogue.
 *
 * Les lignes invalides sont collectées plutôt que de faire échouer tout le
 * fichier : l'administrateur voit d'un coup tout ce qu'il doit corriger.
 */
export function parseCatalogCsv(content: string): CsvParseResult {
  const clean = content.replace(/^﻿/, '').trim();
  if (!clean) throw new BadRequestException('Fichier CSV vide.');

  const lines = clean.split(/\r?\n/);
  // Excel francophone exporte souvent en point-virgule : on détecte le séparateur.
  const separator = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';

  const header = splitCsvLine(lines[0], separator).map((h) => h.trim().toLowerCase());
  const missing = ['id', 'nom_fr', 'prix'].filter((col) => !header.includes(col));
  if (missing.length > 0) {
    throw new BadRequestException(
      `Colonnes obligatoires absentes : ${missing.join(', ')}. Exportez le catalogue pour obtenir le bon format.`,
    );
  }

  const at = (cells: string[], column: string): string => {
    const index = header.indexOf(column);
    return index === -1 ? '' : (cells[index] ?? '').trim();
  };

  const rows: ParsedProductRow[] = [];
  const errors: { ligne: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    const ligne = i + 1;
    const cells = splitCsvLine(raw, separator);

    const id = at(cells, 'id');
    if (!id) {
      errors.push({ ligne, message: 'Identifiant manquant.' });
      continue;
    }
    if (!/^[a-z0-9-]+$/.test(id)) {
      errors.push({
        ligne,
        message: `Identifiant « ${id} » invalide : minuscules, chiffres et tirets uniquement.`,
      });
      continue;
    }

    const price = Number(at(cells, 'prix').replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(price) || price < 0) {
      errors.push({ ligne, message: `Prix invalide pour « ${id} ».` });
      continue;
    }

    const oldPriceRaw = at(cells, 'prix_barre');
    const oldPrice = oldPriceRaw ? Number(oldPriceRaw.replace(/\s/g, '').replace(',', '.')) : undefined;
    if (oldPrice !== undefined && (!Number.isFinite(oldPrice) || oldPrice <= price)) {
      errors.push({
        ligne,
        message: `Prix barré de « ${id} » : il doit être supérieur au prix actuel.`,
      });
      continue;
    }

    const nomFr = at(cells, 'nom_fr');
    if (!nomFr) {
      errors.push({ ligne, message: `Nom français manquant pour « ${id} ».` });
      continue;
    }

    const flags = at(cells, 'etiquettes')
      .split('|')
      .map((f) => f.trim())
      .filter((f) => (PRODUCT_FLAGS as readonly string[]).includes(f));

    const bool = (column: string, fallback: boolean): boolean => {
      const value = at(cells, column).toLowerCase();
      return value === '' ? fallback : BOOLEAN_TRUE.includes(value);
    };

    const weight = Number(at(cells, 'poids_kg').replace(',', '.')) || 0;

    rows.push({
      ligne,
      data: {
        id,
        slug: at(cells, 'slug') || undefined,
        name: { fr: nomFr, en: at(cells, 'nom_en') || nomFr },
        cat: {
          fr: at(cells, 'categorie_fr') || 'Divers',
          en: at(cells, 'categorie_en') || at(cells, 'categorie_fr') || 'Misc',
        },
        desc: {
          fr: at(cells, 'description_fr') || nomFr,
          en: at(cells, 'description_en') || at(cells, 'description_fr') || nomFr,
        },
        price: Math.round(price),
        oldPrice: oldPrice ? Math.round(oldPrice) : undefined,
        flags,
        delay: at(cells, 'delai') || '24-48h',
        poids_kg: weight,
        est_fragile: bool('fragile', false),
        necessite_chaine_froid: bool('chaine_froid', false),
        livraison_autorisee: bool('livraison_autorisee', true),
        necessite_ordonnance: bool('ordonnance', false),
        actif: bool('actif', true),
        images: at(cells, 'images')
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean),
      },
    });
  }

  return { rows, errors };
}
