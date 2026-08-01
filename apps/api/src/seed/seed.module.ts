import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { ProductEntity } from '../entities/product.entity';
import { BoutiqueEntity } from '../entities/boutique.entity';
import { ZoneEntity } from '../entities/zone.entity';
import { QuartierEntity } from '../entities/quartier.entity';
import { TarifLivraisonEntity } from '../entities/tarif-livraison.entity';
import { ReglesLivraisonEntity } from '../entities/regles-livraison.entity';
import { StockEntity } from '../entities/stock.entity';
import { UserEntity } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductEntity,
      BoutiqueEntity,
      ZoneEntity,
      QuartierEntity,
      TarifLivraisonEntity,
      ReglesLivraisonEntity,
      StockEntity,
      UserEntity,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
