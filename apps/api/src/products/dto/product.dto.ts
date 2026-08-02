import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PRODUCT_FLAGS } from '../../data/products.seed';

class LocalizedDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  fr: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  en: string;
}

class LocalizedTextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  fr: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  en: string;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[a-z0-9-]+$/, {
    message: "L'identifiant ne peut contenir que minuscules, chiffres et tirets.",
  })
  id: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @ValidateNested()
  @Type(() => LocalizedDto)
  cat: LocalizedDto;

  @ValidateNested()
  @Type(() => LocalizedDto)
  name: LocalizedDto;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  desc: LocalizedTextDto;

  @IsInt()
  @Min(0)
  @Max(100_000_000)
  price: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  oldPrice?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    (Array.isArray(value) ? value : []).filter((f: string) =>
      (PRODUCT_FLAGS as readonly string[]).includes(f),
    ),
  )
  flags?: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  delay: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsObject()
  variants?: Record<string, string[]>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  poids_kg?: number;

  @IsOptional()
  @IsBoolean()
  est_fragile?: boolean;

  @IsOptional()
  @IsBoolean()
  necessite_chaine_froid?: boolean;

  @IsOptional()
  @IsBoolean()
  livraison_autorisee?: boolean;

  @IsOptional()
  @IsBoolean()
  necessite_ordonnance?: boolean;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Le slug ne peut contenir que minuscules, chiffres et tirets.',
  })
  slug?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedDto)
  cat?: LocalizedDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedDto)
  name?: LocalizedDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  desc?: LocalizedTextDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  oldPrice?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  flags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(60)
  delay?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsObject()
  variants?: Record<string, string[]>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  poids_kg?: number;

  @IsOptional()
  @IsBoolean()
  est_fragile?: boolean;

  @IsOptional()
  @IsBoolean()
  necessite_chaine_froid?: boolean;

  @IsOptional()
  @IsBoolean()
  livraison_autorisee?: boolean;

  @IsOptional()
  @IsBoolean()
  necessite_ordonnance?: boolean;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

export class AdjustStockDto {
  @IsString()
  @IsNotEmpty()
  boutique_id: string;

  @IsInt()
  @Min(0)
  @Max(100_000)
  quantite: number;
}

export class ReorderImagesDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(6)
  images: string[];
}

export class SetFeaturedDto {
  /** Identifiants dans l'ordre d'affichage souhaité. Vide = tri automatique. */
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  productIds: string[];
}

export class ImportCsvDto {
  @IsString()
  @IsNotEmpty({ message: 'Le fichier CSV est vide.' })
  @MaxLength(2_000_000, { message: 'Fichier trop volumineux (2 Mo maximum).' })
  content: string;

  /** Analyse le fichier et compte les changements sans rien écrire. */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
