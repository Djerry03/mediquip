import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Format camerounais : 6XXXXXXXX, éventuellement préfixé +237. */
const PHONE_REGEX = /^(?:\+?237)?[62]\d{8}$/;

export class RegisterDto {
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  email: string;

  @IsString()
  @MinLength(10, { message: 'Le mot de passe doit contenir au moins 10 caractères.' })
  @MaxLength(128)
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom complet est obligatoire.' })
  @MaxLength(120)
  @Transform(({ value }) => String(value ?? '').trim())
  fullName: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: 'Numéro de téléphone camerounais invalide.' })
  @Transform(({ value }) => String(value ?? '').replace(/[\s.-]/g, ''))
  phone?: string;

  /** Consentement aux e-mails commerciaux. Faux tant que la case n'est pas cochée. */
  @IsOptional()
  @IsBoolean()
  newsletterOptIn?: boolean;
}

export class LoginDto {
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => String(value ?? '').trim())
  fullName?: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: 'Numéro de téléphone camerounais invalide.' })
  @Transform(({ value }) => String(value ?? '').replace(/[\s.-]/g, ''))
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  defaultQuartierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  defaultPointRepere?: string;

  @IsOptional()
  @IsBoolean()
  newsletterOptIn?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(10, { message: 'Le nouveau mot de passe doit contenir au moins 10 caractères.' })
  @MaxLength(128)
  newPassword: string;
}
