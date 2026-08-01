import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../entities/order.entity';
import { ProductEntity } from '../entities/product.entity';
import { ReviewEntity } from '../entities/review.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewEntity, OrderEntity, ProductEntity])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
