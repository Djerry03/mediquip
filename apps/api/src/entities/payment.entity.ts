import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentMethod {
  /** Paiement à la livraison / au retrait, encaissé par le livreur. */
  CASH_ON_DELIVERY = 'cash_on_delivery',
  MOBILE_MONEY = 'mobile_money',
}

export enum PaymentStatus {
  /** Créé, en attente d'action du client (saisie du code MoMo…). */
  PENDING = 'pending',
  /** Le fournisseur a confirmé l'encaissement. */
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Entity('payments')
@Index(['orderId'])
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column({ type: 'varchar' })
  method: PaymentMethod;

  @Column({ type: 'varchar', default: PaymentStatus.PENDING })
  status: PaymentStatus;

  /** Montant en FCFA (entier, pas de centimes en zone CEMAC). */
  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'varchar', default: 'XAF' })
  currency: string;

  /** Fournisseur effectif : `manual` ou `momo`. */
  @Column({ type: 'varchar' })
  provider: string;

  /** Référence côté fournisseur, utilisée pour rapprocher les webhooks. */
  @Index({ unique: true })
  @Column({ nullable: true })
  providerReference?: string;

  @Column({ nullable: true })
  payerPhone?: string;

  /** Réponse brute du fournisseur, conservée pour audit et litiges. */
  @Column({ type: 'jsonb', nullable: true })
  providerPayload?: any;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  /** Identifiant de l'administrateur ayant confirmé un paiement manuel. */
  @Column({ nullable: true })
  confirmedByUserId?: string;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
