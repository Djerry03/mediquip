import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductEntity } from '../entities/product.entity';
import { StockEntity } from '../entities/stock.entity';
import { BoutiqueEntity } from '../entities/boutique.entity';
import { StockService } from '../orders/stock.service';
import { slugify } from '../common/slug';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { AdjustStockDto, CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsAdminService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly products: Repository<ProductEntity>,
    @InjectRepository(StockEntity)
    private readonly stocks: Repository<StockEntity>,
    @InjectRepository(BoutiqueEntity)
    private readonly boutiques: Repository<BoutiqueEntity>,
    private readonly stockService: StockService,
    private readonly dataSource: DataSource,
  ) {}

  /** Back-office : inclut les produits désactivés, invisibles côté public. */
  findAll() {
    return this.products.find({ order: { id: 'ASC' } });
  }

  async create(dto: CreateProductDto) {
    if (await this.products.findOne({ where: { id: dto.id } })) {
      throw new BadRequestException(`Un produit porte déjà l'identifiant « ${dto.id} ».`);
    }

    this.assertPricesCoherent(dto.price, dto.oldPrice);

    const product = await this.products.save(
      this.products.create({
        ...dto,
        slug: dto.slug || slugify(dto.name.fr),
        flags: dto.flags ?? [],
        images: dto.images ?? [],
        variants: dto.variants ?? {},
        rating: 0,
        reviews: 0,
        actif: dto.actif ?? true,
      }),
    );

    // Un produit sans ligne de stock n'est commandable nulle part :
    // on en crée une à zéro pour chaque boutique active.
    const boutiques = await this.boutiques.find({ where: { actif: true } });
    await this.stocks.save(
      boutiques.map((b) => ({ produit_id: product.id, boutique_id: b.id, quantite: 0 })),
    );

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Produit introuvable.');

    this.assertPricesCoherent(dto.price ?? product.price, dto.oldPrice ?? product.oldPrice);

    Object.assign(product, dto);
    return this.products.save(product);
  }

  /** Désactivation plutôt que suppression : les commandes passées y réfèrent. */
  async deactivate(id: string) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Produit introuvable.');

    product.actif = false;
    return this.products.save(product);
  }

  async stockFor(productId: string) {
    const [stocks, boutiques] = await Promise.all([
      this.stocks.find({ where: { produit_id: productId } }),
      this.boutiques.find({ where: { actif: true }, order: { ordre_affichage: 'ASC' } }),
    ]);

    return boutiques.map((b) => ({
      boutique_id: b.id,
      boutique_nom: b.nom,
      quantite: stocks.find((s) => s.boutique_id === b.id)?.quantite ?? 0,
    }));
  }

  async adjustStock(productId: string, dto: AdjustStockDto, admin: AuthenticatedUser) {
    const product = await this.products.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable.');

    return this.dataSource.transaction((manager) =>
      this.stockService.adjust(manager, productId, dto.boutique_id, dto.quantite, admin.id),
    );
  }

  private assertPricesCoherent(price: number, oldPrice?: number) {
    if (oldPrice !== undefined && oldPrice !== null && oldPrice > 0 && oldPrice <= price) {
      throw new BadRequestException(
        'Le prix barré doit être supérieur au prix actuel, sinon la promotion n’en est pas une.',
      );
    }
  }
}
