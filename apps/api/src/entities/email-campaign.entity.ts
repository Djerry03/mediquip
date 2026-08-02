import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Audiences ciblables.
 *
 * Toutes présupposent le consentement : une campagne commerciale ne part
 * jamais vers un client qui n'a pas coché l'inscription à la newsletter,
 * quelle que soit l'audience choisie. Les audiences ne font que restreindre
 * davantage cet ensemble déjà consenti.
 */
export enum CampaignAudience {
  /** Tous les inscrits à la newsletter. */
  NEWSLETTER = 'newsletter',
  /** Inscrits ayant déjà reçu au moins une commande. */
  BUYERS = 'buyers',
  /** Inscrits sans commande livrée depuis 90 jours — relance. */
  DORMANT = 'dormant',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('email_campaigns')
@Index(['status'])
export class EmailCampaignEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Nom interne, pour s'y retrouver dans la liste. */
  @Column()
  name: string;

  @Column()
  subject: string;

  /**
   * Corps en texte brut. Volontairement pas de HTML : un éditeur riche
   * exposerait le site à l'injection de contenu dans les boîtes mail des
   * clients, pour un gain esthétique marginal.
   */
  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', default: CampaignAudience.NEWSLETTER })
  audience: CampaignAudience;

  @Column({ type: 'varchar', default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  /** Nombre de destinataires au moment de l'envoi. */
  @Column({ type: 'int', default: 0 })
  recipientCount: number;

  @Column({ type: 'int', default: 0 })
  sentCount: number;

  @Column({ type: 'int', default: 0 })
  failedCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt?: Date;

  @Column({ nullable: true })
  sentByEmail?: string;

  @Column({ type: 'text', nullable: true })
  lastError?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
