import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BannerEntity, BannerPlacement } from '../entities/banner.entity';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';

/** Vue publique d'une bannière : ni dates, ni nom interne. */
export type PublicBanner = {
  id: string;
  placement: BannerPlacement;
  title: { fr: string; en: string };
  subtitle?: { fr: string; en: string };
  ctaLabel?: { fr: string; en: string };
  ctaUrl?: string;
  imageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
};

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(BannerEntity)
    private readonly banners: Repository<BannerEntity>,
  ) {}

  // ------------------------------------------------------------- Public

  /**
   * Bannières réellement diffusables maintenant : actives, et dont la
   * fenêtre de programmation englobe l'instant présent. Une date absente
   * signifie « pas de borne » de ce côté.
   */
  async findActive(placement?: BannerPlacement): Promise<PublicBanner[]> {
    const now = new Date();

    const qb = this.banners
      .createQueryBuilder('b')
      .where('b.active = true')
      .andWhere('(b."startsAt" IS NULL OR b."startsAt" <= :now)', { now })
      .andWhere('(b."endsAt" IS NULL OR b."endsAt" >= :now)', { now })
      .orderBy('b.priority', 'DESC')
      .addOrderBy('b."createdAt"', 'ASC');

    if (placement) qb.andWhere('b.placement = :placement', { placement });

    const rows = await qb.getMany();
    return rows.map((b) => this.toPublic(b));
  }

  private toPublic(b: BannerEntity): PublicBanner {
    return {
      id: b.id,
      placement: b.placement,
      title: b.title,
      subtitle: b.subtitle,
      ctaLabel: b.ctaLabel,
      ctaUrl: b.ctaUrl,
      imageUrl: b.imageUrl,
      backgroundColor: b.backgroundColor,
      textColor: b.textColor,
    };
  }

  // --------------------------------------------------------- Back-office

  findAll(): Promise<BannerEntity[]> {
    return this.banners.find({
      order: { placement: 'ASC', priority: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<BannerEntity> {
    const banner = await this.banners.findOne({ where: { id } });
    if (!banner) throw new NotFoundException('Bannière introuvable.');
    return banner;
  }

  create(dto: CreateBannerDto): Promise<BannerEntity> {
    const { startsAt, endsAt } = this.parseWindow(dto.startsAt, dto.endsAt);

    return this.banners.save(
      this.banners.create({
        ...dto,
        startsAt,
        endsAt,
        priority: dto.priority ?? 0,
        active: dto.active ?? true,
      }),
    );
  }

  async update(id: string, dto: UpdateBannerDto): Promise<BannerEntity> {
    const banner = await this.findOne(id);

    const { startsAt, endsAt } = this.parseWindow(
      dto.startsAt ?? banner.startsAt?.toISOString(),
      dto.endsAt ?? banner.endsAt?.toISOString(),
    );

    Object.assign(banner, dto, { startsAt, endsAt });
    return this.banners.save(banner);
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const banner = await this.findOne(id);
    // Contrairement aux produits, une bannière n'est référencée par aucune
    // commande : la supprimer réellement ne casse pas d'historique.
    await this.banners.remove(banner);
    return { deleted: true };
  }

  async toggle(id: string): Promise<BannerEntity> {
    const banner = await this.findOne(id);
    banner.active = !banner.active;
    return this.banners.save(banner);
  }

  private parseWindow(startsAtRaw?: string, endsAtRaw?: string) {
    const startsAt = startsAtRaw ? new Date(startsAtRaw) : undefined;
    const endsAt = endsAtRaw ? new Date(endsAtRaw) : undefined;

    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new BadRequestException(
        'La date de fin doit être postérieure à la date de début.',
      );
    }

    return { startsAt, endsAt };
  }
}
