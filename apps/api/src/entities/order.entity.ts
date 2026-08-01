import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod, PaymentStatus } from './payment.entity';

export enum OrderStatus {
  /** Commande enregistrée, en attente de confirmation par l'équipe. */
  PENDING = 'pending',
  /** Confirmée : stock réservé, préparation lancée. */
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  /** Colis remis au livreur, ou prêt à être retiré en boutique. */
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
}

export enum ModeReception {
  LIVRAISON = 'livraison',
  RETRAIT = 'retrait',
}

/**
 * Ligne de commande figée au moment de l'achat.
 * Le prix est copié pour qu'une évolution tarifaire ne réécrive pas
 * le montant d'une commande passée.
 */
export type OrderLine = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  color?: string;
  size?: string;
};

export type OrderStatusHistoryEntry = {
  status: OrderStatus;
  at: string;
  by?: string;
  note?: string;
};

@Entity('orders')
@Index(['userId'])
@Index(['status'])
@Index(['createdAt'])
export class OrderEntity {
  /** Référence lisible communiquée au client, ex. MQ-260801-0007. */
  @PrimaryColumn()
  id: string;

  /**
   * Jeton secret imprimé sur la confirmation. Permet à un client sans compte
   * de suivre sa commande sans que le numéro seul suffise à la consulter.
   */
  @Index({ unique: true })
  @Column()
  trackingToken: string;

  /** Null pour une commande passée sans compte. */
  @Column({ nullable: true })
  userId?: string;

  @Column()
  client: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: 'text', default: '' })
  address: string;

  @Column({ type: 'jsonb', default: [] })
  items: OrderLine[];

  // ---- Montants, tous en FCFA entiers, calculés côté serveur ----
  @Column({ type: 'int', default: 0 })
  itemsTotal: number;

  @Column({ type: 'int', default: 0 })
  shippingFee: number;

  @Column({ type: 'int', default: 0 })
  discount: number;

  @Column({ type: 'int' })
  total: number;

  @Column({ nullable: true })
  promotionCode?: string;

  // ---- Statut ----
  @Column({ type: 'varchar', default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'jsonb', default: [] })
  statusHistory: OrderStatusHistoryEntry[];

  @Column({ type: 'text', nullable: true })
  cancellationReason?: string;

  // ---- Paiement ----
  @Column({ type: 'varchar', default: PaymentMethod.CASH_ON_DELIVERY })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  // ---- Livraison / retrait ----
  @Column({ type: 'varchar', default: ModeReception.LIVRAISON })
  mode_reception: ModeReception;

  @Column({ nullable: true })
  boutique_id?: string;

  @Column({ nullable: true })
  quartier_id?: string;

  /** Code de la zone au moment de la commande : le barème peut changer ensuite. */
  @Column({ nullable: true })
  zone_code_snapshot?: string;

  @Column({ type: 'int', nullable: true })
  frais_livraison_snapshot?: number;

  @Column({ type: 'text', nullable: true })
  point_repere_client?: string;

  @Column({ nullable: true })
  telephone_contact?: string;

  /** Code à présenter en boutique pour un retrait. */
  @Column({ nullable: true })
  code_retrait?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  /** Vrai si au moins un article du panier exige une ordonnance. */
  @Column({ type: 'boolean', default: false })
  requiresPrescription: boolean;

  @Column({ type: 'boolean', default: false })
  prescriptionVerified: boolean;

  /** Clé d'idempotence : rejoue le même résultat si le client double-clique. */
  @Index({ unique: true })
  @Column()
  idempotenceKey: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
