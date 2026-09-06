import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum EmailCampaignDeliveryStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * Une ligne par destinataire d'une campagne. Cette file persiste entre deux
 * redémarrages de l'API : un e-mail déjà expédié n'est pas repris.
 */
@Entity('email_campaign_deliveries')
@Index(['campaignId', 'status'])
@Index(['campaignId', 'userId'], { unique: true })
export class EmailCampaignDeliveryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  campaignId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'varchar', default: EmailCampaignDeliveryStatus.PENDING })
  status: EmailCampaignDeliveryStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'text', nullable: true })
  lastError?: string;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
