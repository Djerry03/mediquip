import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('boutiques')
export class BoutiqueEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column({ unique: true })
  code: string;

  @Column()
  quartier: string;

  @Column({ type: 'text' })
  point_repere: string;

  @Column('float')
  latitude: number;

  @Column('float')
  longitude: number;

  @Column()
  telephone: string;

  @Column({ nullable: true })
  whatsapp?: string;

  @Column({ type: 'jsonb', nullable: true })
  horaires?: any;

  @Column({ type: 'boolean', default: false })
  gere_chaine_froid: boolean;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @Column({ type: 'int', default: 0 })
  ordre_affichage: number;
}
