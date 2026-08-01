import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PanierItemDto {
  @IsString()
  @IsNotEmpty()
  produit_id: string;

  @IsInt()
  @Min(1)
  @Max(999)
  quantite: number;
}

export class SimulateDeliveryDto {
  @IsString()
  @IsNotEmpty()
  quartier_id: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PanierItemDto)
  panier: PanierItemDto[];

  @IsOptional()
  @IsBoolean()
  express?: boolean;
}
