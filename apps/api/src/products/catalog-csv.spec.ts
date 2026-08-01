import { BadRequestException } from '@nestjs/common';
import { ProductEntity } from '../entities/product.entity';
import { CSV_COLUMNS, parseCatalogCsv, productsToCsv } from './catalog-csv';

const header = 'id,nom_fr,nom_en,categorie_fr,description_fr,prix,prix_barre,delai,poids_kg,ordonnance';

describe('parseCatalogCsv', () => {
  it('lit une ligne complète', () => {
    const { rows, errors } = parseCatalogCsv(
      `${header}\r\ngarrot,Garrot élastique,Tourniquet,Soins,Garrot réutilisable.,3500,4500,24h,0.1,1\r\n`,
    );

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].data).toMatchObject({
      id: 'garrot',
      price: 3500,
      oldPrice: 4500,
      poids_kg: 0.1,
      necessite_ordonnance: true,
    });
    // Les accents doivent survivre à l'aller-retour.
    expect(rows[0].data.name).toEqual({ fr: 'Garrot élastique', en: 'Tourniquet' });
  });

  it('respecte les champs entre guillemets contenant une virgule', () => {
    const { rows } = parseCatalogCsv(
      `${header}\r\nciseaux,Ciseaux,Scissors,Soins,"Bouts ronds, acier inoxydable.",6000,,24h,0.2,0\r\n`,
    );

    expect(rows[0].data.desc?.fr).toBe('Bouts ronds, acier inoxydable.');
  });

  it('gère les guillemets doublés', () => {
    const { rows } = parseCatalogCsv(
      `${header}\r\nx,Produit,Product,Soins,"Modèle ""Pro"" renforcé",1000,,24h,0.1,0\r\n`,
    );

    expect(rows[0].data.desc?.fr).toBe('Modèle "Pro" renforcé');
  });

  it('détecte le point-virgule des exports Excel francophones', () => {
    const { rows, errors } = parseCatalogCsv(
      'id;nom_fr;prix\r\ncompresse;Compresses stériles;2500\r\n',
    );

    expect(errors).toHaveLength(0);
    expect(rows[0].data.price).toBe(2500);
  });

  it('tolère le BOM UTF-8 placé par Excel', () => {
    const { rows, errors } = parseCatalogCsv('﻿id,nom_fr,prix\r\nx,Produit,1000\r\n');

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
  });

  it('signale les lignes fautives sans perdre les bonnes', () => {
    const { rows, errors } = parseCatalogCsv(
      `id,nom_fr,prix\r\nvalide,Bon produit,1000\r\nMAJUSCULE,Identifiant invalide,1000\r\nsans-prix,Prix illisible,abc\r\nautre-valide,Autre bon produit,2000\r\n`,
    );

    expect(rows.map((r) => r.data.id)).toEqual(['valide', 'autre-valide']);
    expect(errors).toHaveLength(2);
    // Le numéro de ligne doit correspondre au fichier tel que l'admin le voit.
    expect(errors[0].ligne).toBe(3);
    expect(errors[1].ligne).toBe(4);
  });

  it('refuse un prix barré inférieur au prix de vente', () => {
    const { rows, errors } = parseCatalogCsv(
      `${header}\r\nx,Produit,Product,Soins,Description.,5000,3000,24h,0.1,0\r\n`,
    );

    expect(rows).toHaveLength(0);
    expect(errors[0].message).toMatch(/supérieur/);
  });

  it('ignore les étiquettes hors vocabulaire', () => {
    const { rows } = parseCatalogCsv(
      'id,nom_fr,prix,etiquettes\r\nx,Produit,1000,promo|inventée|new\r\n',
    );

    expect(rows[0].data.flags).toEqual(['promo', 'new']);
  });

  it('reprend le français quand l’anglais est absent', () => {
    const { rows } = parseCatalogCsv('id,nom_fr,prix\r\nx,Compresses,1000\r\n');

    expect(rows[0].data.name).toEqual({ fr: 'Compresses', en: 'Compresses' });
  });

  it('rejette un fichier sans les colonnes obligatoires', () => {
    expect(() => parseCatalogCsv('nom,prix\r\nProduit,1000\r\n')).toThrow(BadRequestException);
  });

  it('rejette un fichier vide', () => {
    expect(() => parseCatalogCsv('   ')).toThrow(BadRequestException);
  });

  it('ignore les lignes blanches', () => {
    const { rows } = parseCatalogCsv('id,nom_fr,prix\r\nx,Produit,1000\r\n\r\n\r\n');

    expect(rows).toHaveLength(1);
  });
});

describe('productsToCsv', () => {
  const produit = {
    id: 'p1',
    slug: 'produit-test',
    cat: { fr: 'Soins', en: 'Care' },
    name: { fr: 'Produit, virgule', en: 'Comma product' },
    desc: { fr: 'Une "citation" dedans', en: 'A "quote" inside' },
    price: 1000,
    oldPrice: 1500,
    flags: ['promo', 'new'],
    delay: '24h',
    poids_kg: 1.5,
    est_fragile: true,
    necessite_chaine_froid: false,
    livraison_autorisee: true,
    necessite_ordonnance: false,
    actif: true,
    images: ['/api/uploads/products/a.png', '/api/uploads/products/b.png'],
  } as ProductEntity;

  it('produit un en-tête conforme aux colonnes déclarées', () => {
    expect(productsToCsv([]).replace(/^﻿/, '').split('\r\n')[0]).toBe(CSV_COLUMNS.join(','));
  });

  it('échappe virgules et guillemets', () => {
    const line = productsToCsv([produit]).split('\r\n')[1];

    expect(line).toContain('"Produit, virgule"');
    expect(line).toContain('"Une ""citation"" dedans"');
  });

  it('fait un aller-retour sans perte', () => {
    const { rows, errors } = parseCatalogCsv(productsToCsv([produit]));

    expect(errors).toHaveLength(0);
    expect(rows[0].data).toMatchObject({
      id: 'p1',
      price: 1000,
      oldPrice: 1500,
      poids_kg: 1.5,
      est_fragile: true,
      flags: ['promo', 'new'],
    });
    expect(rows[0].data.name?.fr).toBe('Produit, virgule');
    expect(rows[0].data.images).toHaveLength(2);
  });
});
