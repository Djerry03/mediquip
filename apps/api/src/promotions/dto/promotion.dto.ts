import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PromotionType } from '../../entities/promotion.entity';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'Le code ne peut contenir que lettres, chiffres, tirets et underscores.',
  })
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  code: string;

  @IsEnum(PromotionType)
  type: PromotionType;

  @IsInt()
  @Min(0)
  @Max(10_000_000)
  value: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxRedemptions?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxPerCustomer?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdatePromotionDto {
  @IsOptional()
  @IsEnum(PromotionType)
  type?: PromotionType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  value?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxRedemptions?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxPerCustomer?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ValidatePromotionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  code: string;

  @IsInt()
  @Min(0)
  itemsTotal: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  shippingFee?: number;
}
