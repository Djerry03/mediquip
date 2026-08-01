import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { StockService } from './stock.service';
import { OrderEntity } from '../entities/order.entity';
import { ProductEntity } from '../entities/product.entity';
import { BoutiqueEntity } from '../entities/boutique.entity';
import { StockEntity } from '../entities/stock.entity';
import { StockMovementEntity } from '../entities/stock-movement.entity';
import { DeliveryModule } from '../delivery/delivery.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      ProductEntity,
      BoutiqueEntity,
      StockEntity,
      StockMovementEntity,
    ]),
    DeliveryModule,
    PromotionsModule,
    forwardRef(() => PaymentsModule),
  ],
  providers: [OrdersService, StockService],
  controllers: [OrdersController],
  exports: [OrdersService, StockService],
})
export class OrdersModule {}
