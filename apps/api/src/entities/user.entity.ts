import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  email: string;

  /**
   * Hash bcrypt. `select: false` empêche le hash de sortir de la base
   * par inadvertance : il faut le demander explicitement.
   */
  @Column({ select: false })
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'varchar', default: UserRole.CUSTOMER })
  role: UserRole;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  /** Dernier quartier de livraison utilisé, pour pré-remplir le checkout. */
  @Column({ nullable: true })
  defaultQuartierId?: string;

  @Column({ type: 'text', nullable: true })
  defaultPointRepere?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
