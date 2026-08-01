import { BannerEntity } from './banner.entity';
import { BoutiqueEntity } from './boutique.entity';
import { OrderEntity } from './order.entity';
import { PaymentEntity } from './payment.entity';
import { PrescriptionRequestEntity } from './prescription-request.entity';
import { ProductEntity } from './product.entity';
import { PromotionEntity } from './promotion.entity';
import { QuartierEntity } from './quartier.entity';
import { ReglesLivraisonEntity } from './regles-livraison.entity';
import { ReviewEntity } from './review.entity';
import { StockEntity } from './stock.entity';
import { StockMovementEntity } from './stock-movement.entity';
import { TarifLivraisonEntity } from './tarif-livraison.entity';
import { UserEntity } from './user.entity';
import { ZoneEntity } from './zone.entity';

/** Liste unique des entités — référencée par TypeORM et par la datasource CLI. */
export const ENTITIES = [
  BannerEntity,
  BoutiqueEntity,
  OrderEntity,
  PaymentEntity,
  PrescriptionRequestEntity,
  ProductEntity,
  PromotionEntity,
  QuartierEntity,
  ReglesLivraisonEntity,
  ReviewEntity,
  StockEntity,
  StockMovementEntity,
  TarifLivraisonEntity,
  UserEntity,
  ZoneEntity,
];

export {
  BannerEntity,
  BoutiqueEntity,
  OrderEntity,
  PaymentEntity,
  PrescriptionRequestEntity,
  ProductEntity,
  PromotionEntity,
  QuartierEntity,
  ReglesLivraisonEntity,
  ReviewEntity,
  StockEntity,
  StockMovementEntity,
  TarifLivraisonEntity,
  UserEntity,
  ZoneEntity,
};
