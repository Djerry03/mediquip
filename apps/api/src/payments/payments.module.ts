import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from '../entities/payment.entity';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ManualPaymentProvider } from './providers/manual.provider';
import { MomoPaymentProvider } from './providers/momo.provider';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity]), forwardRef(() => OrdersModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService, ManualPaymentProvider, MomoPaymentProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
