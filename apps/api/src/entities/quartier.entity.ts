import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('quartiers')
@Index(['nom'])
@Index(['slug'])
@Index(['zone_id'])
export class QuartierEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'jsonb', default: [] })
  alias: string[];

  @Column()
  zone_id: string;

  @Column()
  boutique_defaut_id: string;

  @Column('float', { nullable: true })
  latitude?: number;

  @Column('float', { nullable: true })
  longitude?: number;

  @Column({ type: 'boolean', default: true })
  actif: boolean;
}
