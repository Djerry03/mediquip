import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { BoutiqueEntity } from '../entities/boutique.entity';
import { ZoneEntity } from '../entities/zone.entity';
import { QuartierEntity } from '../entities/quartier.entity';
import { TarifLivraisonEntity } from '../entities/tarif-livraison.entity';
import { ReglesLivraisonEntity } from '../entities/regles-livraison.entity';
import { StockEntity } from '../entities/stock.entity';
import { ProductEntity } from '../entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BoutiqueEntity,
      ZoneEntity,
      QuartierEntity,
      TarifLivraisonEntity,
      ReglesLivraisonEntity,
      StockEntity,
      ProductEntity,
    ]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
