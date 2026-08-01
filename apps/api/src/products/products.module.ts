import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsAdminService } from './products.admin.service';
import { ProductsController } from './products.controller';
import { ProductEntity } from '../entities/product.entity';
import { StockEntity } from '../entities/stock.entity';
import { BoutiqueEntity } from '../entities/boutique.entity';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity, StockEntity, BoutiqueEntity]),
    // Pour StockService : le journal des mouvements de stock est partagé
    // entre les commandes et les ajustements du back-office.
    OrdersModule,
  ],
  providers: [ProductsService, ProductsAdminService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
