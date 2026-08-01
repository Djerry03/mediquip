import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('tarifs_livraison')
@Unique(['boutique_id', 'zone_id'])
export class TarifLivraisonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  boutique_id: string;

  @Column()
  zone_id: string;

  @Column({ type: 'int' })
  montant: number;

  @Column({ type: 'boolean', default: true })
  actif: boolean;
}
