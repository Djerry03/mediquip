import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('regles_livraison')
export class ReglesLivraisonEntity {
  @PrimaryColumn()
  id: string; // typically 'singleton'

  @Column({ type: 'int', default: 50000 })
  seuil_franco: number;

  @Column('float', { default: 5 })
  poids_inclus_kg: number;

  @Column({ type: 'int', default: 200 })
  prix_par_kg_supplementaire: number;

  @Column({ type: 'int', default: 1000 })
  supplement_fragile: number;

  @Column({ type: 'int', default: 2000 })
  supplement_chaine_froid: number;

  @Column({ type: 'int', default: 1500 })
  supplement_express: number;

  @Column({ type: 'int', default: 1000 })
  supplement_boutique_eloignee: number;

  @Column({ type: 'boolean', default: true })
  livraison_active: boolean;
}
