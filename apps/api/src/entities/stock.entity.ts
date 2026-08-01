import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('stocks')
export class StockEntity {
  @PrimaryColumn()
  produit_id: string;

  @PrimaryColumn()
  boutique_id: string;

  @Column({ type: 'int', default: 0 })
  quantite: number;
}
