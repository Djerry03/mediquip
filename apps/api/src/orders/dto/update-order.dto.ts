import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '../../entities/order.entity';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: 'Statut de commande inconnu.' })
  status: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
