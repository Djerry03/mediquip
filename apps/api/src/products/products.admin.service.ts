import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ProductEntity } from '../entities/product.entity';
import { StockEntity } from '../entities/stock.entity';
import { BoutiqueEntity } from '../entities/boutique.entity';
import { StockService } from '../orders/stock.service';
import { slugify } from '../common/slug';
import { deleteImageByUrl, storeImage } from '../common/image-upload';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { AdjustStockDto, CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { parseCatalogCsv, productsToCsv } from './catalog-csv';

export type ImportReport = {
  crees: number;
  misAJour: number;
  ignores: number;
  erreurs: { ligne: number; message: string }[];
};

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

  // ------------------------------------------------------------- Lecture

  /** Back-office : inclut les produits désactivés, invisibles côté public. */
  findAll(): Promise<ProductEntity[]> {
    return this.products.find({ order: { actif: 'DESC', id: 'ASC' } });
  }

  async findOne(id: string): Promise<ProductEntity> {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Produit introuvable.');
    return product;
  }

  /** Catégories existantes, pour alimenter les listes déroulantes du formulaire. */
  async categories(): Promise<{ fr: string; en: string; count: number }[]> {
    const products = await this.products.find({ select: ['cat'] });
    const map = new Map<string, { fr: string; en: string; count: number }>();

    for (const p of products) {
      if (!p.cat?.fr) continue;
      const key = p.cat.fr.toLowerCase();
      const existing = map.get(key);
      if (existing) existing.count++;
      else map.set(key, { fr: p.cat.fr, en: p.cat.en || p.cat.fr, count: 1 });
    }

    return [...map.values()].sort((a, b) => a.fr.localeCompare(b.fr));
  }

  // ------------------------------------------------------------ Écriture

  async create(dto: CreateProductDto): Promise<ProductEntity> {
    if (await this.products.findOne({ where: { id: dto.id } })) {
      throw new BadRequestException(`Un produit porte déjà l'identifiant « ${dto.id} ».`);
    }

    this.assertPricesCoherent(dto.price, dto.oldPrice);

    const slug = await this.uniqueSlug(dto.slug || slugify(dto.name.fr), dto.id);

    const product = await this.products.save(
      this.products.create({
        ...dto,
        slug,
        flags: dto.flags ?? [],
        images: dto.images ?? [],
        variants: dto.variants ?? {},
        rating: 0,
        reviews: 0,
        actif: dto.actif ?? true,
      }),
    );

    await this.ensureStockRows(product.id);
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductEntity> {
    const product = await this.findOne(id);

    this.assertPricesCoherent(dto.price ?? product.price, dto.oldPrice ?? product.oldPrice);

    // `oldPrice: null` explicite retire la promotion ; `undefined` la conserve.
    const patch: Partial<ProductEntity> = { ...dto } as Partial<ProductEntity>;
    if (dto.oldPrice === 0) patch.oldPrice = null as unknown as undefined;

    if (dto.name && !dto.slug) {
      patch.slug = await this.uniqueSlug(slugify(dto.name.fr), id);
    }

    Object.assign(product, patch);
    return this.products.save(product);
  }

  /**
   * Désactivation par défaut : les commandes passées référencent le produit
   * et doivent rester lisibles. La suppression définitive n'est possible que
   * pour un produit qui n'a jamais été commandé.
   */
  async deactivate(id: string): Promise<ProductEntity> {
    const product = await this.findOne(id);
    product.actif = false;
    return this.products.save(product);
  }

  async reactivate(id: string): Promise<ProductEntity> {
    const product = await this.findOne(id);
    product.actif = true;
    return this.products.save(product);
  }

  async destroy(id: string): Promise<{ deleted: true }> {
    const product = await this.findOne(id);

    const [{ count }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM orders WHERE items @> $1`,
      [JSON.stringify([{ productId: id }])],
    );

    if (count > 0) {
      throw new BadRequestException(
        `« ${product.name.fr} » figure dans ${count} commande(s) : il ne peut pas être supprimé, seulement désactivé.`,
      );
    }

    for (const url of product.images ?? []) {
      await deleteImageByUrl(url, 'products');
    }

    await this.stocks.delete({ produit_id: id });
    await this.products.remove(product);

    return { deleted: true };
  }

  // -------------------------------------------------------------- Images

  async addImage(id: string, file: Express.Multer.File): Promise<ProductEntity> {
    const product = await this.findOne(id);

    if ((product.images?.length ?? 0) >= 6) {
      throw new BadRequestException('Six visuels au maximum par produit.');
    }

    const { url } = await storeImage(file, 'products');
    product.images = [...(product.images ?? []), url];

    return this.products.save(product);
  }

  async removeImage(id: string, url: string): Promise<ProductEntity> {
    const product = await this.findOne(id);

    if (!product.images?.includes(url)) {
      throw new NotFoundException('Ce visuel n’appartient pas à ce produit.');
    }

    product.images = product.images.filter((image) => image !== url);
    await deleteImageByUrl(url, 'products');

    return this.products.save(product);
  }

  /** Réordonne les visuels : le premier sert de vignette au catalogue. */
  async reorderImages(id: string, images: string[]): Promise<ProductEntity> {
    const product = await this.findOne(id);

    const current = [...(product.images ?? [])].sort();
    const proposed = [...images].sort();

    if (current.length !== proposed.length || current.some((url, i) => url !== proposed[i])) {
      throw new BadRequestException(
        'La liste réordonnée doit contenir exactement les visuels existants.',
      );
    }

    product.images = images;
    return this.products.save(product);
  }

  // --------------------------------------------------------------- Stock

  async stockFor(productId: string) {
    const [stocks, boutiques] = await Promise.all([
      this.stocks.find({ where: { produit_id: productId } }),
      this.boutiques.find({ where: { actif: true }, order: { ordre_affichage: 'ASC' } }),
    ]);

    return boutiques.map((b) => ({
      boutique_id: b.id,
      boutique_nom: b.nom,
      gere_chaine_froid: b.gere_chaine_froid,
      quantite: stocks.find((s) => s.boutique_id === b.id)?.quantite ?? 0,
    }));
  }

  async adjustStock(productId: string, dto: AdjustStockDto, admin: AuthenticatedUser) {
    await this.findOne(productId);

    return this.dataSource.transaction((manager) =>
      this.stockService.adjust(manager, productId, dto.boutique_id, dto.quantite, admin.id),
    );
  }

  // ------------------------------------------------------- Mise en avant

  /** Produits actuellement mis en avant, dans l'ordre choisi. */
  featured(): Promise<ProductEntity[]> {
    return this.products
      .createQueryBuilder('p')
      .where('p."featuredRank" IS NOT NULL')
      .orderBy('p."featuredRank"', 'ASC')
      .getMany();
  }

  /**
   * Remplace la sélection par la liste fournie, dans l'ordre.
   * Une liste vide rend la main au tri automatique de l'accueil.
   */
  async setFeatured(productIds: string[]): Promise<ProductEntity[]> {
    if (productIds.length > 12) {
      throw new BadRequestException('Douze produits en vedette au maximum.');
    }

    const found = await this.products.find({ where: { id: In(productIds) } });
    const missing = productIds.filter((id) => !found.some((p) => p.id === id));
    if (missing.length > 0) {
      throw new BadRequestException(`Produit introuvable : ${missing.join(', ')}.`);
    }

    const inactive = found.filter((p) => !p.actif);
    if (inactive.length > 0) {
      throw new BadRequestException(
        `Un produit désactivé ne peut pas être mis en avant : ${inactive
          .map((p) => p.name.fr)
          .join(', ')}.`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      // On repart d'une ardoise vierge : sinon un produit retiré de la
      // sélection garderait son rang et resterait affiché.
      await manager
        .createQueryBuilder()
        .update(ProductEntity)
        .set({ featuredRank: null })
        .where('"featuredRank" IS NOT NULL')
        .execute();

      for (const [index, id] of productIds.entries()) {
        await manager.update(ProductEntity, { id }, { featuredRank: index });
      }
    });

    return this.featured();
  }

  // ----------------------------------------------------------------- CSV

  async exportCsv(): Promise<string> {
    return productsToCsv(await this.products.find({ order: { id: 'ASC' } }));
  }

  /**
   * Import en masse. Les produits existants sont mis à jour, les nouveaux
   * créés. Tout se joue dans une transaction : un fichier partiellement
   * valide ne laisse pas le catalogue à moitié modifié.
   */
  async importCsv(content: string, dryRun = false): Promise<ImportReport> {
    const { rows, errors } = parseCatalogCsv(content);

    if (rows.length === 0) {
      return { crees: 0, misAJour: 0, ignores: 0, erreurs: errors };
    }

    const ids = rows.map((r) => r.data.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicates.length > 0) {
      errors.push({
        ligne: 0,
        message: `Identifiants en double dans le fichier : ${[...new Set(duplicates)].join(', ')}.`,
      });
      return { crees: 0, misAJour: 0, ignores: rows.length, erreurs: errors };
    }

    const existing = await this.products.find({ where: { id: In(ids) } });
    const existingIds = new Set(existing.map((p) => p.id));

    const report: ImportReport = {
      crees: rows.filter((r) => !existingIds.has(r.data.id)).length,
      misAJour: rows.filter((r) => existingIds.has(r.data.id)).length,
      ignores: 0,
      erreurs: errors,
    };

    if (dryRun) return report;

    await this.dataSource.transaction(async (manager) => {
      for (const { data } of rows) {
        const current = existing.find((p) => p.id === data.id);

        if (current) {
          // La note et le nombre d'avis sont calculés à partir des avis
          // réels : un import ne doit jamais les écraser.
          manager.merge(ProductEntity, current, {
            ...data,
            slug: data.slug || current.slug,
          });
          await manager.save(current);
        } else {
          await manager.save(
            manager.create(ProductEntity, {
              ...data,
              slug: data.slug || slugify(data.name!.fr),
              rating: 0,
              reviews: 0,
              variants: {},
            }),
          );
        }
      }
    });

    for (const { data } of rows) {
      if (!existingIds.has(data.id)) await this.ensureStockRows(data.id);
    }

    return report;
  }

  // ------------------------------------------------------------- Interne

  /** Un produit sans ligne de stock n'est commandable nulle part. */
  private async ensureStockRows(productId: string) {
    const boutiques = await this.boutiques.find({ where: { actif: true } });
    const existing = await this.stocks.find({ where: { produit_id: productId } });

    const missing = boutiques
      .filter((b) => !existing.some((s) => s.boutique_id === b.id))
      .map((b) => ({ produit_id: productId, boutique_id: b.id, quantite: 0 }));

    if (missing.length > 0) await this.stocks.save(missing);
  }

  private async uniqueSlug(base: string, ownId: string): Promise<string> {
    const root = base || ownId;
    let candidate = root;
    let suffix = 2;

    // Le slug sert d'URL publique : deux produits ne peuvent pas partager
    // la même, sous peine de rendre l'une des deux fiches inatteignable.
    while (true) {
      const clash = await this.products.findOne({ where: { slug: candidate } });
      if (!clash || clash.id === ownId) return candidate;
      candidate = `${root}-${suffix++}`;
    }
  }

  private assertPricesCoherent(price: number, oldPrice?: number | null) {
    if (oldPrice !== undefined && oldPrice !== null && oldPrice > 0 && oldPrice <= price) {
      throw new BadRequestException(
        'Le prix barré doit être supérieur au prix actuel, sinon la promotion n’en est pas une.',
      );
    }
  }
}
