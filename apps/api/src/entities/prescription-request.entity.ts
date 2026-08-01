import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PrescriptionStatus {
  RECEIVED = 'received',
  IN_REVIEW = 'in_review',
  QUOTED = 'quoted',
  REJECTED = 'rejected',
}

/**
 * Demande de devis à partir d'une ordonnance ou d'une liste de matériel
 * envoyée en photo. Contient des données de santé : accès strictement
 * réservé au client propriétaire et aux administrateurs.
 */
@Entity('prescription_requests')
@Index(['userId'])
export class PrescriptionRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId?: string;

  @Column()
  clientName: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  /** Nom du fichier sur disque — jamais le nom d'origine fourni par le client. */
  @Column()
  storedFileName: string;

  @Column()
  mimeType: string;

  @Column({ type: 'int' })
  sizeBytes: number;

  @Column({ type: 'varchar', default: PrescriptionStatus.RECEIVED })
  status: PrescriptionStatus;

  @Column({ type: 'text', nullable: true })
  adminNote?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
