import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CampaignAudience } from '../../entities/email-campaign.entity';

export class CreateEmailCampaignDto {
  @IsString()
  @IsNotEmpty({ message: 'Donnez un nom interne à cette campagne.' })
  @MaxLength(120)
  @Transform(({ value }) => String(value ?? '').trim())
  name: string;

  @IsString()
  @IsNotEmpty({ message: "L'objet de l'e-mail est obligatoire." })
  @MaxLength(150)
  @Transform(({ value }) => String(value ?? '').trim())
  subject: string;

  @IsString()
  @MinLength(20, { message: 'Le message doit contenir au moins 20 caractères.' })
  @MaxLength(10_000)
  body: string;

  @IsEnum(CampaignAudience, { message: 'Audience inconnue.' })
  audience: CampaignAudience;
}

export class UpdateEmailCampaignDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => String(value ?? '').trim())
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => String(value ?? '').trim())
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(10_000)
  body?: string;

  @IsOptional()
  @IsEnum(CampaignAudience)
  audience?: CampaignAudience;
}

export class TestSendDto {
  /** Adresse de test — l'aperçu part vers vous, pas vers les clients. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  email: string;
}
