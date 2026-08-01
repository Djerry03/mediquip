import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BannerPlacement } from '../../entities/banner.entity';

export class LocalizedTextDto {
  @IsString()
  @IsNotEmpty({ message: 'Le texte français est obligatoire.' })
  @MaxLength(200)
  fr: string;

  @IsString()
  @IsNotEmpty({ message: 'Le texte anglais est obligatoire.' })
  @MaxLength(200)
  en: string;
}

/**
 * Le lien doit rester interne au site ou pointer vers du HTTPS explicite.
 * Interdire `javascript:` et consorts évite qu'un compte admin compromis
 * n'injecte un lien exécutable dans le bandeau vu par tous les visiteurs.
 */
const SAFE_URL = /^(\/[\w\-./?=&%#]*|https?:\/\/[\w\-.]+(:\d+)?(\/[\w\-./?=&%#]*)?)$/;

export class CreateBannerDto {
  @IsString()
  @IsNotEmpty({ message: 'Donnez un nom interne à cette bannière.' })
  @MaxLength(120)
  name: string;

  @IsEnum(BannerPlacement, { message: 'Emplacement inconnu.' })
  placement: BannerPlacement;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  subtitle?: LocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  ctaLabel?: LocalizedTextDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(SAFE_URL, { message: 'Lien invalide : utilisez /une-page ou https://…' })
  ctaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(SAFE_URL, { message: 'Adresse d’image invalide.' })
  imageUrl?: string;

  @IsOptional()
  @IsHexColor({ message: 'Couleur de fond invalide (format #RRGGBB).' })
  backgroundColor?: string;

  @IsOptional()
  @IsHexColor({ message: 'Couleur de texte invalide (format #RRGGBB).' })
  textColor?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Date de début invalide.' })
  startsAt?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Date de fin invalide.' })
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateBannerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(BannerPlacement)
  placement?: BannerPlacement;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title?: LocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  subtitle?: LocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  ctaLabel?: LocalizedTextDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(SAFE_URL, { message: 'Lien invalide : utilisez /une-page ou https://…' })
  ctaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(SAFE_URL, { message: 'Adresse d’image invalide.' })
  imageUrl?: string;

  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
