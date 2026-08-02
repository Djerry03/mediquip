import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CampaignPageEntity } from '../entities/campaign-page.entity';
import { ProductEntity } from '../entities/product.entity';
import { CreateCampaignPageDto, UpdateCampaignPageDto } from './dto/campaign-page.dto';

/** Réservé par l'application : une page de campagne ne peut pas s'y substituer. */
const RESERVED_SLUGS = [
  'admin',
  'account',
  'cart',
  'catalog',
  'checkout',
  'legal',
  'packs',
  'products',
  'tracking',
  'desinscription',
];

@Injectable()
export class CampaignPagesService {
  constructor(
    @InjectRepository(CampaignPageEntity)
    private readonly pages: Repository<CampaignPageEntity>,
    @InjectRepository(ProductEntity)
    private readonly products: Repository<ProductEntity>,
  ) {}

  // -------------------------------------------------------------- Public

  /** Pages réellement en ligne : publiées et dans leur fenêtre de diffusion. */
  private liveQuery() {
    const now = new Date();
    return this.pages
      .createQueryBuilder('p')
      .where('p.published = true')
      .andWhere('(p."startsAt" IS NULL OR p."startsAt" <= :now)', { now })
      .andWhere('(p."endsAt" IS NULL OR p."endsAt" >= :now)', { now });
  }

  async findLiveSlugs(): Promise<string[]> {
    const rows = await this.liveQuery().select('p.slug', 'slug').getRawMany();
    return rows.map((r) => r.slug);
  }

  /**
   * Page publique, produits résolus. Les produits désactivés ou supprimés
   * depuis la création de la page sont simplement omis : une campagne ne
   * doit pas afficher un article qu'on ne peut plus vendre.
   */
  async findLiveBySlug(slug: string) {
    const page = await this.liveQuery().andWhere('p.slug = :slug', { slug }).getOne();
    if (!page) throw new NotFoundException('Page de campagne introuvable.');

    const products = page.productIds.length
      ? await this.products.find({ where: { id: In(page.productIds), actif: true } })
      : [];

    // On restitue l'ordre choisi au back-office, que `find` ne garantit pas.
    const ordered = page.productIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is ProductEntity => !!p);

    return {
      slug: page.slug,
      title: page.title,
      subtitle: page.subtitle,
      paragraphs: page.paragraphs,
      seoDescription: page.seoDescription,
      promotionCode: page.promotionCode,
      heroImageUrl: page.heroImageUrl,
      backgroundColor: page.backgroundColor,
      textColor: page.textColor,
      products: ordered,
    };
  }

  // --------------------------------------------------------- Back-office

  findAll(): Promise<CampaignPageEntity[]> {
    return this.pages.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<CampaignPageEntity> {
    const page = await this.pages.findOne({ where: { id } });
    if (!page) throw new NotFoundException('Page de campagne introuvable.');
    return page;
  }

  async create(dto: CreateCampaignPageDto): Promise<CampaignPageEntity> {
    this.assertSlugUsable(dto.slug);
    if (await this.pages.findOne({ where: { slug: dto.slug } })) {
      throw new BadRequestException(`L’adresse /promo/${dto.slug} est déjà prise.`);
    }

    await this.assertProductsExist(dto.productIds);
    const { startsAt, endsAt } = this.parseWindow(dto.startsAt, dto.endsAt);

    return this.pages.save(
      this.pages.create({
        ...dto,
        startsAt,
        endsAt,
        paragraphs: dto.paragraphs ?? [],
        productIds: dto.productIds ?? [],
        published: dto.published ?? false,
      }),
    );
  }

  async update(id: string, dto: UpdateCampaignPageDto): Promise<CampaignPageEntity> {
    const page = await this.findOne(id);

    await this.assertProductsExist(dto.productIds);
    const { startsAt, endsAt } = this.parseWindow(
      dto.startsAt ?? page.startsAt?.toISOString(),
      dto.endsAt ?? page.endsAt?.toISOString(),
    );

    Object.assign(page, dto, { startsAt, endsAt });
    return this.pages.save(page);
  }

  async togglePublished(id: string): Promise<CampaignPageEntity> {
    const page = await this.findOne(id);
    page.published = !page.published;
    return this.pages.save(page);
  }

  async remove(id: string): Promise<{ deleted: true }> {
    await this.pages.remove(await this.findOne(id));
    return { deleted: true };
  }

  // ------------------------------------------------------------- Interne

  private assertSlugUsable(slug: string) {
    if (RESERVED_SLUGS.includes(slug)) {
      throw new BadRequestException(`« ${slug} » est une adresse réservée par le site.`);
    }
  }

  private async assertProductsExist(productIds?: string[]) {
    if (!productIds || productIds.length === 0) return;

    const found = await this.products.find({
      where: { id: In(productIds) },
      select: ['id'],
    });

    const missing = productIds.filter((id) => !found.some((p) => p.id === id));
    if (missing.length > 0) {
      throw new BadRequestException(`Produit introuvable : ${missing.join(', ')}.`);
    }
  }

  private parseWindow(startsAtRaw?: string, endsAtRaw?: string) {
    const startsAt = startsAtRaw ? new Date(startsAtRaw) : undefined;
    const endsAt = endsAtRaw ? new Date(endsAtRaw) : undefined;

    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new BadRequestException('La date de fin doit être postérieure à la date de début.');
    }

    return { startsAt, endsAt };
  }
}
