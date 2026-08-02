import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
  ) {}

  /** Catalogue public : les produits désactivés ne sont jamais exposés. */
  findAll(): Promise<ProductEntity[]> {
    return this.productRepository.find({
      where: { actif: true },
      order: { price: 'ASC' },
    });
  }

  /**
   * Sélection « produits vedettes » de l'accueil.
   *
   * Renvoie la sélection manuelle si l'administrateur en a fait une, sinon
   * un repli automatique sur les produits étiquetés promo, nouveauté ou
   * best-seller : l'accueil n'est jamais vide.
   */
  async findFeatured(limit = 4): Promise<ProductEntity[]> {
    const manual = await this.productRepository
      .createQueryBuilder('p')
      .where('p.actif = true')
      .andWhere('p."featuredRank" IS NOT NULL')
      .orderBy('p."featuredRank"', 'ASC')
      .take(limit)
      .getMany();

    if (manual.length > 0) return manual;

    const all = await this.productRepository.find({ where: { actif: true } });
    return all
      .filter((p) => (p.flags ?? []).some((f) => ['bestseller', 'promo', 'new'].includes(f)))
      .slice(0, limit);
  }

  /** Accepte indifféremment l'identifiant technique ou le slug SEO. */
  async findOne(idOrSlug: string): Promise<ProductEntity | null> {
    const byId = await this.productRepository.findOne({
      where: { id: idOrSlug, actif: true },
    });
    if (byId) return byId;

    return this.productRepository.findOne({ where: { slug: idOrSlug, actif: true } });
  }
}
