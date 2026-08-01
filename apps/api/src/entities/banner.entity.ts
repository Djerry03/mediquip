import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Emplacements où une bannière peut être diffusée sur le site public. */
export enum BannerPlacement {
  /** Bandeau fin en haut de toutes les pages (annonces courtes). */
  TOP_STRIP = 'top_strip',
  /** Grande bannière en tête de la page d'accueil. */
  HOME_HERO = 'home_hero',
  /** Encart au-dessus de la grille du catalogue. */
  CATALOG_TOP = 'catalog_top',
  /** Encart dans le récapitulatif du panier (relance, franco). */
  CART_NOTICE = 'cart_notice',
}

export type LocalizedText = { fr: string; en: string };

@Entity('banners')
@Index(['placement', 'active'])
export class BannerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Nom interne, visible du seul back-office. */
  @Column()
  name: string;

  @Column({ type: 'varchar' })
  placement: BannerPlacement;

  @Column({ type: 'jsonb' })
  title: LocalizedText;

  @Column({ type: 'jsonb', nullable: true })
  subtitle?: LocalizedText;

  @Column({ type: 'jsonb', nullable: true })
  ctaLabel?: LocalizedText;

  /** Lien interne (/catalog) ou absolu (https://…). */
  @Column({ nullable: true })
  ctaUrl?: string;

  @Column({ nullable: true })
  imageUrl?: string;

  /** Couleurs au format #RRGGBB, validées à l'écriture. */
  @Column({ nullable: true })
  backgroundColor?: string;

  @Column({ nullable: true })
  textColor?: string;

  /**
   * Fenêtre de diffusion. Une bannière programmée dans le futur reste
   * invisible sans intervention ; une bannière expirée disparaît seule.
   */
  @Column({ type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt?: Date;

  /** À emplacement égal, la priorité la plus élevée passe en premier. */
  @Column({ type: 'int', default: 0 })
  priority: number;

  /** Interrupteur manuel, indépendant des dates. */
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
