import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('products')
export class ProductEntity {
  @PrimaryColumn()
  id: string;

  /** Identifiant lisible utilisé dans les URLs publiques (SEO). */
  @Index({ unique: true })
  @Column({ nullable: true })
  slug?: string;

  @Column({ type: 'jsonb' })
  cat: { fr: string; en: string };

  @Column({ type: 'jsonb' })
  name: { fr: string; en: string };

  /** Prix effectivement payé aujourd'hui, en FCFA (entier). */
  @Column({ type: 'int' })
  price: number;

  /** Ancien prix barré. Toujours supérieur à `price` quand il est défini. */
  @Column({ type: 'int', nullable: true })
  oldPrice?: number;

  @Column('simple-array')
  flags: string[];

  @Column()
  delay: string;

  @Column('float')
  rating: number;

  @Column('int')
  reviews: number;

  @Column({ type: 'jsonb' })
  desc: { fr: string; en: string };

  @Column({ type: 'jsonb', default: {} })
  variants: any;

  /** Chemins d'images relatifs au dossier `public/` du frontend. */
  @Column({ type: 'jsonb', default: [] })
  images: string[];

  @Column('float', { default: 0 })
  poids_kg: number;

  @Column({ type: 'boolean', default: false })
  est_fragile: boolean;

  @Column({ type: 'boolean', default: false })
  necessite_chaine_froid: boolean;

  @Column({ type: 'boolean', default: true })
  livraison_autorisee: boolean;

  @Column({ type: 'boolean', default: false })
  necessite_ordonnance: boolean;

  /** Un produit inactif reste en base mais disparaît du catalogue public. */
  @Column({ type: 'boolean', default: true })
  actif: boolean;

  /**
   * Position dans la sélection « produits vedettes » de l'accueil.
   * `null` = non sélectionné. Quand aucun produit n'est positionné, la page
   * d'accueil retombe sur son tri automatique par étiquette.
   */
  @Column({ type: 'int', nullable: true })
  featuredRank?: number | null;
}
