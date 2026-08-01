import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrderEntity, OrderStatus } from '../entities/order.entity';
import { ProductEntity } from '../entities/product.entity';
import { ReviewEntity, ReviewStatus } from '../entities/review.entity';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateReviewDto, ModerateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviews: Repository<ReviewEntity>,
    @InjectRepository(OrderEntity)
    private readonly orders: Repository<OrderEntity>,
    @InjectRepository(ProductEntity)
    private readonly products: Repository<ProductEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /** Avis publics d'un produit : uniquement ceux qui sont publiés. */
  async findPublished(productId: string) {
    const product = await this.products.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable.');

    const reviews = await this.reviews.find({
      where: { productId, status: ReviewStatus.PUBLISHED },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return reviews.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Dépôt d'un avis. Réservé aux clients ayant effectivement reçu le
   * produit : c'est ce qui distingue un avis vérifié d'un commentaire
   * anonyme, et ce qui rend la note affichée crédible.
   */
  async create(productId: string, dto: CreateReviewDto, user: AuthenticatedUser) {
    const product = await this.products.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable.');

    const deliveredOrder = await this.orders
      .createQueryBuilder('o')
      .where('o.userId = :userId', { userId: user.id })
      .andWhere('o.status = :status', { status: OrderStatus.DELIVERED })
      .andWhere(`o.items @> :item`, { item: JSON.stringify([{ productId }]) })
      .getOne();

    if (!deliveredOrder) {
      throw new ForbiddenException(
        'Seuls les clients ayant reçu ce produit peuvent le noter.',
      );
    }

    const existing = await this.reviews.findOne({ where: { userId: user.id, productId } });
    if (existing) {
      throw new BadRequestException('Vous avez déjà laissé un avis sur ce produit.');
    }

    const review = await this.reviews.save(
      this.reviews.create({
        productId,
        userId: user.id,
        authorName: this.displayName(user.fullName),
        rating: dto.rating,
        comment: dto.comment.trim(),
        orderId: deliveredOrder.id,
        status: ReviewStatus.PENDING,
      }),
    );

    return { id: review.id, status: review.status };
  }

  // ----------------------------------------------------------- Modération

  findPending() {
    return this.reviews.find({
      where: { status: ReviewStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async moderate(id: string, dto: ModerateReviewDto) {
    const review = await this.reviews.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Avis introuvable.');

    review.status = dto.status;
    await this.reviews.save(review);

    await this.recomputeProductRating(review.productId);
    return review;
  }

  /**
   * Recalcule note moyenne et nombre d'avis à partir des avis publiés.
   * Les champs `rating`/`reviews` du produit deviennent ainsi le reflet
   * de données réelles, et non plus des valeurs figées dans le seed.
   */
  private async recomputeProductRating(productId: string) {
    const { avg, count } = await this.reviews
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.productId = :productId AND r.status = :status', {
        productId,
        status: ReviewStatus.PUBLISHED,
      })
      .getRawOne();

    await this.products.update(productId, {
      rating: avg ? Math.round(Number(avg) * 10) / 10 : 0,
      reviews: Number(count) || 0,
    });
  }

  /**
   * « Ariane Ngo Bell » → « Ariane B. ».
   * Seuls le prénom et l'initiale du dernier nom sont publiés, quel que soit
   * le nombre de composants : un avis ne doit pas identifier son auteur.
   */
  private displayName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'Client';
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
  }
}
