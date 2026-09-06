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

  /**
   * Incrémenté lors d'un changement de mot de passe ou d'une déconnexion.
   * Les JWT portant une ancienne version sont alors immédiatement refusés.
   */
  @Column({ type: 'int', default: 0 })
  sessionVersion: number;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  /** Dernier quartier de livraison utilisé, pour pré-remplir le checkout. */
  @Column({ nullable: true })
  defaultQuartierId?: string;

  @Column({ type: 'text', nullable: true })
  defaultPointRepere?: string;

  /**
   * Consentement explicite aux e-mails commerciaux. Faux par défaut : le
   * client doit cocher la case, jamais la décocher. Les e-mails liés à une
   * commande (confirmation, changement de statut) ne dépendent pas de ce
   * champ — ce sont des messages transactionnels, pas de la prospection.
   */
  @Column({ type: 'boolean', default: false })
  newsletterOptIn: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  newsletterOptInAt?: Date;

  /**
   * Jeton du lien de désinscription. Permet de se désabonner en un clic
   * depuis l'e-mail, sans se connecter.
   */
  @Index({ unique: true })
  @Column({ nullable: true })
  unsubscribeToken?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
