import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderEntity } from '../entities/order.entity';
import { PromotionEntity, PromotionType } from '../entities/promotion.entity';
import { PromotionsService } from './promotions.service';

/** Promotion de base : les tests n'écrasent que ce qui les intéresse. */
const promo = (patch: Partial<PromotionEntity> = {}): PromotionEntity =>
  ({
    id: 'promo-1',
    code: 'MEDI10',
    type: PromotionType.PERCENT,
    value: 10,
    minAmount: 0,
    maxDiscount: 0,
    maxRedemptions: 0,
    redemptions: 0,
    maxPerCustomer: 0,
    active: true,
    ...patch,
  }) as PromotionEntity;

describe('PromotionsService', () => {
  let service: PromotionsService;
  let promotions: { findOne: jest.Mock };
  let orders: { count: jest.Mock };

  beforeEach(async () => {
    promotions = { findOne: jest.fn() };
    orders = { count: jest.fn().mockResolvedValue(0) };

    const module = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: getRepositoryToken(PromotionEntity), useValue: promotions },
        { provide: getRepositoryToken(OrderEntity), useValue: orders },
      ],
    }).compile();

    service = module.get(PromotionsService);
  });

  it('applique une remise en pourcentage', async () => {
    promotions.findOne.mockResolvedValue(promo({ value: 10 }));

    const result = await service.validate('MEDI10', 50_000, 2_000);

    expect(result.discount).toBe(5_000);
    expect(result.freeShipping).toBe(false);
  });

  it('plafonne la remise en pourcentage à maxDiscount', async () => {
    promotions.findOne.mockResolvedValue(promo({ value: 50, maxDiscount: 10_000 }));

    const result = await service.validate('MEDI10', 100_000, 0);

    expect(result.discount).toBe(10_000);
  });

  it('ne rembourse jamais plus que le panier avec une remise fixe', async () => {
    promotions.findOne.mockResolvedValue(promo({ type: PromotionType.FIXED, value: 20_000 }));

    const result = await service.validate('MEDI10', 8_000, 1_000);

    expect(result.discount).toBe(8_000);
  });

  it('rend la livraison gratuite pour un code FREE_SHIPPING', async () => {
    promotions.findOne.mockResolvedValue(promo({ type: PromotionType.FREE_SHIPPING }));

    const result = await service.validate('LIVRAISON', 12_000, 3_000);

    expect(result.freeShipping).toBe(true);
    expect(result.discount).toBe(3_000);
  });

  it('refuse un code inactif', async () => {
    promotions.findOne.mockResolvedValue(promo({ active: false }));
    await expect(service.validate('MEDI10', 50_000, 0)).rejects.toThrow(BadRequestException);
  });

  it('refuse un code expiré', async () => {
    promotions.findOne.mockResolvedValue(promo({ expiresAt: new Date('2020-01-01') }));
    await expect(service.validate('MEDI10', 50_000, 0)).rejects.toThrow(/expiré/);
  });

  it('refuse un code pas encore actif', async () => {
    promotions.findOne.mockResolvedValue(promo({ startsAt: new Date('2999-01-01') }));
    await expect(service.validate('MEDI10', 50_000, 0)).rejects.toThrow(/pas encore/);
  });

  it('refuse sous le montant minimum', async () => {
    promotions.findOne.mockResolvedValue(promo({ minAmount: 30_000 }));
    await expect(service.validate('MEDI10', 10_000, 0)).rejects.toThrow(/à partir de/);
  });

  it('refuse un code ayant atteint son quota global', async () => {
    promotions.findOne.mockResolvedValue(promo({ maxRedemptions: 5, redemptions: 5 }));
    await expect(service.validate('MEDI10', 50_000, 0)).rejects.toThrow(/limite/);
  });

  it('exige un compte quand le code est limité par client', async () => {
    promotions.findOne.mockResolvedValue(promo({ maxPerCustomer: 1 }));
    await expect(service.validate('MEDI10', 50_000, 0)).rejects.toThrow(/compte/);
  });

  it('refuse un code déjà utilisé par ce client', async () => {
    promotions.findOne.mockResolvedValue(promo({ maxPerCustomer: 1 }));
    orders.count.mockResolvedValue(1);

    await expect(service.validate('MEDI10', 50_000, 0, 'user-1')).rejects.toThrow(/déjà utilisé/);
  });

  it('normalise la casse du code saisi', async () => {
    promotions.findOne.mockResolvedValue(promo());

    await service.validate('  medi10  ', 50_000, 0);

    expect(promotions.findOne).toHaveBeenCalledWith({ where: { code: 'MEDI10' } });
  });

  it('refuse un code inexistant', async () => {
    promotions.findOne.mockResolvedValue(null);
    await expect(service.validate('INCONNU', 50_000, 0)).rejects.toThrow(BadRequestException);
  });
});
