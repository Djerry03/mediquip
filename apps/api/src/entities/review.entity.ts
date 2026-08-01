import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export enum ReviewStatus {
  PENDING = 'pending',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
}

/** Un client ne peut noter qu'une seule fois un produit donné. */
@Entity('reviews')
@Unique(['userId', 'productId'])
@Index(['productId', 'status'])
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column()
  userId: string;

  /** Copie du nom au moment de l'avis : renommer son compte ne réécrit pas l'historique. */
  @Column()
  authorName: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text' })
  comment: string;

  /** Commande ayant permis l'achat vérifié — un avis exige une commande livrée. */
  @Column({ nullable: true })
  orderId?: string;

  @Column({ type: 'varchar', default: ReviewStatus.PENDING })
  status: ReviewStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
