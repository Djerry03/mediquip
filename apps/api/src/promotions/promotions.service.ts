import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OrderEntity } from '../entities/order.entity';
import { PromotionEntity, PromotionType } from '../entities/promotion.entity';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';

export type DiscountResult = {
  code: string;
  type: PromotionType;
  /** Remise appliquée au sous-total articles. */
  discount: number;
  /** Vrai si le code offre la livraison. */
  freeShipping: boolean;
  label: string;
};

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(PromotionEntity)
    private readonly promotions: Repository<PromotionEntity>,
    @InjectRepository(OrderEntity)
    private readonly orders: Repository<OrderEntity>,
  ) {}

  // ---------------------------------------------------------------- Public

  /**
   * Valide un code et calcule la remise. Ne consomme rien : la
   * consommation n'a lieu qu'à la création effective de la commande.
   */
  async validate(
    rawCode: string,
    itemsTotal: number,
    shippingFee: number,
    userId?: string,
  ): Promise<DiscountResult> {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) throw new BadRequestException('Code promo manquant.');

    const promo = await this.promotions.findOne({ where: { code } });
    if (!promo || !promo.active) {
      throw new BadRequestException('Ce code promo est invalide ou expiré.');
    }

    const now = new Date();
    if (promo.startsAt && promo.startsAt > now) {
      throw new BadRequestException("Ce code promo n'est pas encore actif.");
    }
    if (promo.expiresAt && promo.expiresAt < now) {
      throw new BadRequestException('Ce code promo est expiré.');
    }
    if (promo.maxRedemptions > 0 && promo.redemptions >= promo.maxRedemptions) {
      throw new BadRequestException("Ce code promo a atteint sa limite d'utilisation.");
    }
    if (itemsTotal < promo.minAmount) {
      throw new BadRequestException(
        `Ce code s'applique à partir de ${promo.minAmount.toLocaleString('fr-FR')} FCFA d'articles.`,
      );
    }

    if (promo.maxPerCustomer > 0) {
      if (!userId) {
        throw new BadRequestException(
          'Ce code est réservé aux clients disposant d’un compte. Connectez-vous pour l’utiliser.',
        );
      }
      const used = await this.orders.count({ where: { userId, promotionCode: code } });
      if (used >= promo.maxPerCustomer) {
        throw new BadRequestException('Vous avez déjà utilisé ce code promo.');
      }
    }

    return this.computeDiscount(promo, itemsTotal, shippingFee);
  }

  private computeDiscount(
    promo: PromotionEntity,
    itemsTotal: number,
    shippingFee: number,
  ): DiscountResult {
    switch (promo.type) {
      case PromotionType.FREE_SHIPPING:
        return {
          code: promo.code,
          type: promo.type,
          discount: shippingFee,
          freeShipping: true,
          label: 'Livraison offerte',
        };

      case PromotionType.FIXED: {
        const discount = Math.min(promo.value, itemsTotal);
        return {
          code: promo.code,
          type: promo.type,
          discount,
          freeShipping: false,
          label: `Remise de ${discount.toLocaleString('fr-FR')} FCFA`,
        };
      }

      case PromotionType.PERCENT:
      default: {
        let discount = Math.floor((itemsTotal * promo.value) / 100);
        if (promo.maxDiscount > 0) discount = Math.min(discount, promo.maxDiscount);
        discount = Math.min(discount, itemsTotal);
        return {
          code: promo.code,
          type: PromotionType.PERCENT,
          discount,
          freeShipping: false,
          label: `Remise de ${promo.value} %`,
        };
      }
    }
  }

  /**
   * Incrémente le compteur d'utilisations. Appelé dans la transaction de
   * création de commande pour que remise et consommation soient atomiques.
   */
  async consume(code: string, manager: EntityManager): Promise<void> {
    await manager.increment(PromotionEntity, { code: code.toUpperCase() }, 'redemptions', 1);
  }

  async release(code: string, manager: EntityManager): Promise<void> {
    await manager.decrement(PromotionEntity, { code: code.toUpperCase() }, 'redemptions', 1);
  }

  // ----------------------------------------------------------- Back-office

  findAll() {
    return this.promotions.find({ order: { createdAt: 'DESC' } });
  }

  async create(dto: CreatePromotionDto) {
    const code = dto.code.trim().toUpperCase();
    if (await this.promotions.findOne({ where: { code } })) {
      throw new BadRequestException('Ce code promo existe déjà.');
    }
    this.assertCoherent(dto.type, dto.value);

    return this.promotions.save(
      this.promotions.create({
        ...dto,
        code,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      }),
    );
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const promo = await this.promotions.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Code promo introuvable.');

    if (dto.type || dto.value !== undefined) {
      this.assertCoherent(dto.type ?? promo.type, dto.value ?? promo.value);
    }

    Object.assign(promo, {
      ...dto,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : promo.startsAt,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : promo.expiresAt,
    });

    return this.promotions.save(promo);
  }

  async remove(id: string) {
    const promo = await this.promotions.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Code promo introuvable.');
    // Désactivation plutôt que suppression : les commandes passées
    // référencent ce code et doivent rester lisibles.
    promo.active = false;
    return this.promotions.save(promo);
  }

  private assertCoherent(type: PromotionType, value: number) {
    if (type === PromotionType.PERCENT && (value < 1 || value > 100)) {
      throw new BadRequestException('Une remise en pourcentage doit être comprise entre 1 et 100.');
    }
    if (type === PromotionType.FIXED && value < 1) {
      throw new BadRequestException('Une remise fixe doit être supérieure à 0 FCFA.');
    }
  }
}
