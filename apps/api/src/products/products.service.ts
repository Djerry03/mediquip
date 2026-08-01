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

  /** Accepte indifféremment l'identifiant technique ou le slug SEO. */
  async findOne(idOrSlug: string): Promise<ProductEntity | null> {
    const byId = await this.productRepository.findOne({
      where: { id: idOrSlug, actif: true },
    });
    if (byId) return byId;

    return this.productRepository.findOne({ where: { slug: idOrSlug, actif: true } });
  }
}
