import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PromotionType {
  /** Pourcentage de remise sur le sous-total articles. */
  PERCENT = 'percent',
  /** Montant fixe en FCFA. */
  FIXED = 'fixed',
  /** Livraison offerte quel que soit le seuil franco. */
  FREE_SHIPPING = 'free_shipping',
}

@Entity('promotions')
export class PromotionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Code saisi par le client, stocké en majuscules. */
  @Index({ unique: true })
  @Column()
  code: string;

  @Column({ type: 'varchar', default: PromotionType.PERCENT })
  type: PromotionType;

  /** Pourcentage (1-100) ou montant fixe en FCFA selon `type`. */
  @Column({ type: 'int', default: 0 })
  value: number;

  /** Sous-total articles minimum pour que le code s'applique. */
  @Column({ type: 'int', default: 0 })
  minAmount: number;

  /** Plafond de remise pour les codes en pourcentage (0 = illimité). */
  @Column({ type: 'int', default: 0 })
  maxDiscount: number;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  /** Nombre total d'utilisations autorisées (0 = illimité). */
  @Column({ type: 'int', default: 0 })
  maxRedemptions: number;

  @Column({ type: 'int', default: 0 })
  redemptions: number;

  /** Limite par client (0 = illimité). Nécessite un compte. */
  @Column({ type: 'int', default: 1 })
  maxPerCustomer: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
