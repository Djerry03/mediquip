import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PrescriptionStatus } from '../../entities/prescription-request.entity';

const PHONE_REGEX = /^(?:\+?237)?[62]\d{8}$/;

export class CreatePrescriptionDto {
  @IsString()
  @IsNotEmpty({ message: 'Votre nom est obligatoire.' })
  @MaxLength(120)
  @Transform(({ value }) => String(value ?? '').trim())
  clientName: string;

  @IsString()
  @Matches(PHONE_REGEX, { message: 'Numéro de téléphone camerounais invalide.' })
  @Transform(({ value }) => String(value ?? '').replace(/[\s.-]/g, ''))
  phone: string;

  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @Transform(({ value }) => (value ? String(value).trim().toLowerCase() : undefined))
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UpdatePrescriptionDto {
  @IsOptional()
  @IsEnum(PrescriptionStatus)
  status?: PrescriptionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
