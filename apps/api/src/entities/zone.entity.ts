import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('zones')
export class ZoneEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  libelle: string;

  @Column()
  delai_estime: string;

  @Column({ type: 'boolean', default: true })
  livraison_disponible: boolean;

  @Column({ type: 'boolean', default: true })
  actif: boolean;
}
