import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsHexColor,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from './banner.dto';

const SAFE_URL = /^(\/[\w\-./?=&%#]*|https?:\/\/[\w\-.]+(:\d+)?(\/[\w\-./?=&%#]*)?)$/;

/** Paragraphe long : la limite de LocalizedTextDto (200) est trop courte ici. */
export class ParagraphDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  fr: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  en: string;
}

export class CreateCampaignPageDto {
  @IsString()
  @IsNotEmpty({ message: 'L’adresse de la page est obligatoire.' })
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'L’adresse ne peut contenir que minuscules, chiffres et tirets.',
  })
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  slug: string;

  @IsString()
  @IsNotEmpty({ message: 'Donnez un nom interne à cette page.' })
  @MaxLength(120)
  name: string;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  subtitle?: LocalizedTextDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ParagraphDto)
  paragraphs?: ParagraphDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  seoDescription?: LocalizedTextDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(({ value }) => (value ? String(value).trim().toUpperCase() : undefined))
  promotionCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(SAFE_URL, { message: 'Adresse d’image invalide.' })
  heroImageUrl?: string;

  @IsOptional()
  @IsHexColor({ message: 'Couleur de fond invalide (format #RRGGBB).' })
  backgroundColor?: string;

  @IsOptional()
  @IsHexColor({ message: 'Couleur de texte invalide (format #RRGGBB).' })
  textColor?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;
}

export class UpdateCampaignPageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title?: LocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  subtitle?: LocalizedTextDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ParagraphDto)
  paragraphs?: ParagraphDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  seoDescription?: LocalizedTextDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(({ value }) => (value ? String(value).trim().toUpperCase() : undefined))
  promotionCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(SAFE_URL)
  heroImageUrl?: string;

  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;
}
