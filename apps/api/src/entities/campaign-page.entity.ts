import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type LocalizedText = { fr: string; en: string };

/**
 * Page de campagne autonome, publiée sous /promo/<slug>.
 *
 * Le contenu est structuré (titre, accroche, paragraphes, sélection de
 * produits) plutôt que libre en HTML : une page alimentée par du HTML saisi
 * au back-office deviendrait un vecteur d'injection sur tout le site.
 */
@Entity('campaign_pages')
@Index(['published'])
export class CampaignPageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Segment d'URL public : /promo/rentree-medicale. */
  @Index({ unique: true })
  @Column()
  slug: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb' })
  title: LocalizedText;

  @Column({ type: 'jsonb', nullable: true })
  subtitle?: LocalizedText;

  /** Paragraphes affichés sous l'accroche, un par entrée. */
  @Column({ type: 'jsonb', default: [] })
  paragraphs: LocalizedText[];

  /** Description utilisée par les moteurs de recherche et les partages. */
  @Column({ type: 'jsonb', nullable: true })
  seoDescription?: LocalizedText;

  /** Produits mis en avant, dans l'ordre choisi. */
  @Column({ type: 'jsonb', default: [] })
  productIds: string[];

  /** Code promo rappelé sur la page, s'il y en a un. */
  @Column({ nullable: true })
  promotionCode?: string;

  @Column({ nullable: true })
  heroImageUrl?: string;

  @Column({ nullable: true })
  backgroundColor?: string;

  @Column({ nullable: true })
  textColor?: string;

  @Column({ type: 'boolean', default: false })
  published: boolean;

  /** Fenêtre de publication, même logique que les bannières. */
  @Column({ type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
