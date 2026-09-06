import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ModeReception } from '../../entities/order.entity';
import { PaymentMethod } from '../../entities/payment.entity';

const PHONE_REGEX = /^(?:\+?237)?[62]\d{8}$/;

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  productId: string;

  @IsInt()
  @Min(1)
  @Max(99)
  qty: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  size?: string;

  // Le prix n'est volontairement PAS accepté depuis le client :
  // `forbidNonWhitelisted` rejette la requête s'il est envoyé.
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom complet est obligatoire.' })
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

  @IsArray()
  @ArrayMinSize(1, { message: 'Votre panier est vide.' })
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsEnum(ModeReception)
  mode_reception: ModeReception;

  /** Obligatoire en livraison : détermine la zone et donc le tarif. */
  @ValidateIf((o) => o.mode_reception === ModeReception.LIVRAISON)
  @IsString()
  @IsNotEmpty({ message: 'Veuillez choisir un quartier de livraison.' })
  quartier_id?: string;

  @ValidateIf((o) => o.mode_reception === ModeReception.LIVRAISON)
  @IsString()
  @IsNotEmpty({ message: 'Un point de repère est nécessaire pour vous livrer.' })
  @MaxLength(300)
  @Transform(({ value }) => String(value ?? '').trim())
  point_repere_client?: string;

  /** Obligatoire en retrait : la boutique où le client vient chercher sa commande. */
  @ValidateIf((o) => o.mode_reception === ModeReception.RETRAIT)
  @IsString()
  @IsNotEmpty({ message: 'Veuillez choisir une boutique de retrait.' })
  boutique_id?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  /** Numéro Mobile Money du payeur, si différent du téléphone de contact. */
  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: 'Numéro Mobile Money invalide.' })
  @Transform(({ value }) => (value ? String(value).replace(/[\s.-]/g, '') : undefined))
  payerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(({ value }) => (value ? String(value).trim().toUpperCase() : undefined))
  promotionCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: 'Numéro de contact invalide.' })
  @Transform(({ value }) => (value ? String(value).replace(/[\s.-]/g, '') : undefined))
  telephone_contact?: string;

  /**
   * Identifie une tentative de commande côté client. La même clé peut être
   * rejouée après une coupure réseau ; une nouvelle commande doit toujours
   * recevoir une nouvelle clé.
   */
  @IsUUID('4', { message: "La clé d'idempotence doit être un UUID v4." })
  idempotenceKey: string;

  /** Livraison express (supplément appliqué par le moteur de livraison). */
  @IsOptional()
  @IsBoolean()
  express?: boolean;
}
