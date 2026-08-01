import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum StockMovementReason {
  /** Réservation à la création d'une commande. */
  ORDER_RESERVED = 'order_reserved',
  /** Remise en stock après annulation ou retour. */
  ORDER_RELEASED = 'order_released',
  /** Correction manuelle depuis le back-office. */
  MANUAL_ADJUSTMENT = 'manual_adjustment',
  /** Réapprovisionnement fournisseur. */
  RESTOCK = 'restock',
}

/**
 * Journal des mouvements de stock. Permet de reconstituer l'historique
 * et d'auditer un écart d'inventaire, ce qu'un simple compteur ne permet pas.
 */
@Entity('stock_movements')
@Index(['produit_id', 'boutique_id'])
export class StockMovementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  produit_id: string;

  @Column()
  boutique_id: string;

  /** Négatif pour une sortie, positif pour une entrée. */
  @Column({ type: 'int' })
  delta: number;

  @Column({ type: 'int' })
  quantiteApres: number;

  @Column({ type: 'varchar' })
  reason: StockMovementReason;

  @Column({ nullable: true })
  orderId?: string;

  @Column({ nullable: true })
  userId?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
