import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { randomBytes, randomInt } from 'crypto';

import { ModeReception, OrderEntity, OrderLine, OrderStatus } from '../entities/order.entity';
import { PaymentMethod, PaymentStatus } from '../entities/payment.entity';
import { ProductEntity } from '../entities/product.entity';
import { BoutiqueEntity } from '../entities/boutique.entity';
import { UserRole } from '../entities/user.entity';
import { DeliveryService } from '../delivery/delivery.service';
import { PromotionsService } from '../promotions/promotions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateOrderDto } from './dto/create-order.dto';
import { StockService } from './stock.service';
import {
  assertTransition,
  CUSTOMER_CANCELLABLE_STATES,
  STOCK_RESERVED_STATES,
} from './order-status';

/** Caractères sans ambiguïté visuelle (ni 0/O ni 1/I) pour un code dicté au téléphone. */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export type CreatedOrder = OrderEntity & {
  payment?: unknown;
  delai_estime?: string;
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(OrderEntity)
    private readonly orders: Repository<OrderEntity>,
    @InjectRepository(ProductEntity)
    private readonly products: Repository<ProductEntity>,
    @InjectRepository(BoutiqueEntity)
    private readonly boutiques: Repository<BoutiqueEntity>,
    private readonly delivery: DeliveryService,
    private readonly promotions: PromotionsService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationsService,
    private readonly stock: StockService,
    private readonly config: ConfigService,
  ) {}

  // ------------------------------------------------------------- Création

  async create(dto: CreateOrderDto, user?: AuthenticatedUser): Promise<CreatedOrder> {
    // La clé d'idempotence est portée par le client. À défaut, on en dérive
    // une du contenu : un double-clic ne crée pas deux commandes.
    const idempotenceKey =
      dto.idempotenceKey?.trim() ||
      [
        user?.id ?? 'guest',
        dto.phone,
        dto.mode_reception,
        dto.quartier_id ?? dto.boutique_id ?? '',
        dto.items
          .map((i) => `${i.productId}:${i.qty}:${i.color ?? ''}:${i.size ?? ''}`)
          .sort()
          .join('|'),
      ].join('#');

    const existing = await this.orders.findOne({ where: { idempotenceKey } });
    if (existing) return existing;

    // 1. Prix et contraintes lus en base, jamais depuis la requête.
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.products.find({ where: { id: In(productIds) } });

    const missing = productIds.filter((id) => !products.some((p) => p.id === id));
    if (missing.length > 0) {
      throw new BadRequestException(`Produit introuvable : ${missing.join(', ')}.`);
    }

    const inactive = products.filter((p) => !p.actif);
    if (inactive.length > 0) {
      throw new BadRequestException(
        `Ces produits ne sont plus disponibles : ${inactive.map((p) => p.name.fr).join(', ')}.`,
      );
    }

    const lines: OrderLine[] = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        productId: product.id,
        name: product.name.fr,
        qty: item.qty,
        unitPrice: product.price,
        lineTotal: product.price * item.qty,
        color: item.color,
        size: item.size,
      };
    });

    const itemsTotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const requiresPrescription = products.some((p) => p.necessite_ordonnance);

    // 2. Mode de réception : frais de livraison ou boutique de retrait.
    let shippingFee = 0;
    let zoneCodeSnapshot: string | undefined;
    let boutiqueId: string | undefined;
    let address = '';
    let codeRetrait: string | undefined;
    let deliveryDelay: string | undefined;

    if (dto.mode_reception === ModeReception.LIVRAISON) {
      const undeliverable = products.filter((p) => !p.livraison_autorisee);
      if (undeliverable.length > 0) {
        throw new BadRequestException(
          `Ces produits doivent être retirés en boutique : ${undeliverable
            .map((p) => p.name.fr)
            .join(', ')}.`,
        );
      }

      const simulation = await this.delivery.simulateDelivery({
        quartier_id: dto.quartier_id!,
        panier: dto.items.map((i) => ({ produit_id: i.productId, quantite: i.qty })),
        express: dto.express === true,
      });

      if (simulation.mode !== 'tarif') {
        throw new BadRequestException(
          simulation.message || "La livraison n'est pas possible pour cette commande.",
        );
      }

      shippingFee = simulation.frais ?? 0;
      zoneCodeSnapshot = simulation.zone_code_snapshot;
      boutiqueId = simulation.boutique_expedition?.id;
      deliveryDelay = simulation.delai_estime;

      const quartier = await this.delivery.findQuartier(dto.quartier_id!);
      address = quartier?.nom ?? '';
    } else {
      const boutique = await this.boutiques.findOne({
        where: { id: dto.boutique_id!, actif: true },
      });
      if (!boutique) throw new BadRequestException('Boutique de retrait introuvable.');

      const coldChain = products.filter((p) => p.necessite_chaine_froid);
      if (coldChain.length > 0 && !boutique.gere_chaine_froid) {
        throw new BadRequestException(
          `${boutique.nom} ne gère pas la chaîne du froid. Choisissez une autre boutique pour : ${coldChain
            .map((p) => p.name.fr)
            .join(', ')}.`,
        );
      }

      boutiqueId = boutique.id;
      address = `${boutique.nom} — ${boutique.point_repere}`;
      codeRetrait = this.generateCodeRetrait();
    }

    if (!boutiqueId) {
      throw new BadRequestException(
        "Aucune boutique ne peut traiter cette commande pour l'instant.",
      );
    }

    // 3. Code promo : validé avant la transaction, consommé à l'intérieur.
    let discount = 0;
    let promotionCode: string | undefined;
    if (dto.promotionCode) {
      const result = await this.promotions.validate(
        dto.promotionCode,
        itemsTotal,
        shippingFee,
        user?.id,
      );
      discount = result.discount;
      promotionCode = result.code;
      if (result.freeShipping) shippingFee = 0;
    }

    const total = Math.max(0, itemsTotal + shippingFee - discount);
    const paymentMethod = dto.paymentMethod ?? PaymentMethod.CASH_ON_DELIVERY;

    // 4. Écriture atomique : numéro, stock, promo et commande dans une seule
    //    transaction. Un stock insuffisant annule tout — rien n'est écrit.
    const order = await this.dataSource.transaction(async (manager) => {
      const id = await this.nextOrderId(manager);

      await this.stock.reserve(
        manager,
        boutiqueId!,
        dto.items.map((i) => ({ produit_id: i.productId, quantite: i.qty })),
        id,
        new Map(products.map((p) => [p.id, p.name.fr])),
      );

      if (promotionCode) await this.promotions.consume(promotionCode, manager);

      return manager.save(
        manager.create(OrderEntity, {
          id,
          trackingToken: randomBytes(16).toString('hex'),
          userId: user?.id,
          client: dto.clientName,
          phone: dto.phone,
          email: dto.email,
          address,
          items: lines,
          itemsTotal,
          shippingFee,
          discount,
          total,
          promotionCode,
          status: OrderStatus.PENDING,
          statusHistory: [{ status: OrderStatus.PENDING, at: new Date().toISOString() }],
          paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          mode_reception: dto.mode_reception,
          boutique_id: boutiqueId,
          quartier_id: dto.quartier_id,
          zone_code_snapshot: zoneCodeSnapshot,
          frais_livraison_snapshot: shippingFee,
          point_repere_client: dto.point_repere_client,
          telephone_contact: dto.telephone_contact || dto.phone,
          code_retrait: codeRetrait,
          note: dto.note,
          requiresPrescription,
          prescriptionVerified: false,
          idempotenceKey,
        }),
      );
    });

    // 5. Effets de bord post-transaction. Ils ne doivent jamais faire échouer
    //    une commande déjà enregistrée, donc chacun est isolé.
    const payment = await this.payments.initiateForOrder(order, dto.payerPhone).catch((err) => {
      this.logger.error(`Initiation du paiement échouée pour ${order.id} : ${err.message}`);
      return null;
    });

    await this.notifications.notifyOrderCreated(order, this.trackingUrl(order));

    return { ...order, payment: payment ?? undefined, delai_estime: deliveryDelay };
  }

  // -------------------------------------------------------------- Lecture

  /** Commandes du client connecté. */
  findMine(userId: string) {
    return this.orders.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  /**
   * Consultation d'une commande.
   * - Un administrateur voit tout.
   * - Le propriétaire voit la sienne.
   * - Un invité doit présenter le jeton de suivi reçu à la commande : le
   *   numéro seul, séquentiel et devinable, ne suffit pas.
   */
  async findOneFor(
    id: string,
    user?: AuthenticatedUser,
    trackingToken?: string,
  ): Promise<OrderEntity> {
    const order = await this.orders.findOne({ where: { id: id.trim().toUpperCase() } });
    if (!order) throw new NotFoundException('Commande introuvable.');

    if (user?.role === UserRole.ADMIN) return order;
    if (user && order.userId === user.id) return order;
    if (trackingToken && this.constantTimeEquals(trackingToken, order.trackingToken)) return order;

    throw new ForbiddenException(
      'Accès refusé : connectez-vous avec le compte ayant passé cette commande, ou utilisez le lien de suivi reçu lors de l’achat.',
    );
  }

  /** Back-office : liste paginée et filtrable. */
  async findAllForAdmin(options: {
    status?: OrderStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 25));

    const qb = this.orders.createQueryBuilder('o').orderBy('o.createdAt', 'DESC');

    if (options.status) qb.andWhere('o.status = :status', { status: options.status });
    if (options.search) {
      qb.andWhere('(o.id ILIKE :q OR o.client ILIKE :q OR o.phone ILIKE :q)', {
        q: `%${options.search}%`,
      });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  // --------------------------------------------------------- Cycle de vie

  /** Changement de statut par un administrateur. */
  async updateStatus(
    id: string,
    next: OrderStatus,
    admin: AuthenticatedUser,
    note?: string,
  ): Promise<OrderEntity> {
    const updated = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(OrderEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Commande introuvable.');

      assertTransition(order.status, next);

      if (
        next === OrderStatus.CONFIRMED &&
        order.requiresPrescription &&
        !order.prescriptionVerified
      ) {
        throw new BadRequestException(
          'Cette commande contient un produit soumis à ordonnance. Vérifiez l’ordonnance avant de confirmer.',
        );
      }

      // On quitte un état où le stock était réservé → il faut le rendre.
      const leavingReserved =
        STOCK_RESERVED_STATES.includes(order.status) && !STOCK_RESERVED_STATES.includes(next);

      if (leavingReserved && order.boutique_id) {
        await this.stock.release(
          manager,
          order.boutique_id,
          order.items.map((i) => ({ produit_id: i.productId, quantite: i.qty })),
          order.id,
          admin.id,
        );
        if (order.promotionCode) await this.promotions.release(order.promotionCode, manager);
      }

      // Le paiement à la livraison est encaissé au moment de la livraison.
      if (
        next === OrderStatus.DELIVERED &&
        order.paymentMethod === PaymentMethod.CASH_ON_DELIVERY &&
        order.paymentStatus === PaymentStatus.PENDING
      ) {
        order.paymentStatus = PaymentStatus.SUCCEEDED;
      }

      order.status = next;
      order.statusHistory = [
        ...(order.statusHistory || []),
        { status: next, at: new Date().toISOString(), by: admin.email, note },
      ];

      return manager.save(order);
    });

    await this.notifications.notifyOrderStatusChanged(updated, this.trackingUrl(updated));
    return updated;
  }

  /** Annulation par le client, tant que la commande n'est pas partie. */
  async cancelByCustomer(
    id: string,
    user: AuthenticatedUser,
    reason?: string,
  ): Promise<OrderEntity> {
    const updated = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(OrderEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Commande introuvable.');

      if (order.userId !== user.id && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Cette commande n’est pas la vôtre.');
      }

      if (!CUSTOMER_CANCELLABLE_STATES.includes(order.status)) {
        throw new BadRequestException(
          'Cette commande est déjà en préparation ou expédiée. Contactez-nous pour l’annuler.',
        );
      }

      if (order.boutique_id) {
        await this.stock.release(
          manager,
          order.boutique_id,
          order.items.map((i) => ({ produit_id: i.productId, quantite: i.qty })),
          order.id,
          user.id,
        );
      }
      if (order.promotionCode) await this.promotions.release(order.promotionCode, manager);

      order.status = OrderStatus.CANCELLED;
      order.cancellationReason = reason || 'Annulée par le client.';
      order.statusHistory = [
        ...(order.statusHistory || []),
        {
          status: OrderStatus.CANCELLED,
          at: new Date().toISOString(),
          by: user.email,
          note: reason,
        },
      ];

      return manager.save(order);
    });

    await this.notifications.notifyOrderStatusChanged(updated, this.trackingUrl(updated));
    return updated;
  }

  /** Marque l'ordonnance comme vérifiée (back-office). */
  async markPrescriptionVerified(id: string, admin: AuthenticatedUser): Promise<OrderEntity> {
    const order = await this.orders.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Commande introuvable.');

    order.prescriptionVerified = true;
    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status: order.status,
        at: new Date().toISOString(),
        by: admin.email,
        note: 'Ordonnance vérifiée.',
      },
    ];
    return this.orders.save(order);
  }

  /** Utilisé par le module paiement pour refléter l'encaissement. */
  async applyPaymentStatus(orderId: string, status: PaymentStatus): Promise<OrderEntity | null> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) return null;

    order.paymentStatus = status;
    return this.orders.save(order);
  }

  // --------------------------------------------------------------- Outils

  /**
   * Numéro lisible MQ-AAMMJJ-NNNN, séquentiel dans la journée.
   * Le verrou de table garantit que deux commandes simultanées n'obtiennent
   * pas le même numéro ; il est pris à l'intérieur de la transaction et
   * relâché à son terme.
   */
  private async nextOrderId(manager: EntityManager): Promise<string> {
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const prefix = `MQ-${datePart}-`;

    await manager.query('LOCK TABLE orders IN SHARE ROW EXCLUSIVE MODE');

    const rows = await manager.query(
      'SELECT id FROM orders WHERE id LIKE $1 ORDER BY id DESC LIMIT 1',
      [`${prefix}%`],
    );

    const lastSequence = rows?.[0] ? Number(String(rows[0].id).slice(prefix.length)) : 0;
    return `${prefix}${String(lastSequence + 1).padStart(4, '0')}`;
  }

  private generateCodeRetrait(): string {
    return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  }

  private trackingUrl(order: OrderEntity): string {
    const base = this.config.get<string>('NEXT_PUBLIC_SITE_URL', 'http://localhost:3004');
    return `${base}/tracking?id=${order.id}&token=${order.trackingToken}`;
  }

  /** Comparaison à temps constant : ne fuit pas le jeton par mesure du délai. */
  private constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }
}
