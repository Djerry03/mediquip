import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { StockEntity } from '../entities/stock.entity';
import { StockMovementEntity, StockMovementReason } from '../entities/stock-movement.entity';

export type StockLine = { produit_id: string; quantite: number };

/**
 * Gestion du stock.
 *
 * Toutes les méthodes prennent un `EntityManager` : elles sont conçues pour
 * être appelées à l'intérieur de la transaction de la commande, jamais seules.
 */
@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  /**
   * Réserve les quantités demandées dans une boutique.
   *
   * Les lignes de stock sont verrouillées (`SELECT … FOR UPDATE`) et triées
   * par identifiant produit : deux commandes concurrentes prennent les
   * verrous dans le même ordre, ce qui rend l'interblocage impossible.
   * La décrémentation est conditionnée à `quantite >= :qty`, si bien qu'une
   * commande ne peut jamais faire passer un stock sous zéro.
   */
  async reserve(
    manager: EntityManager,
    boutiqueId: string,
    lines: StockLine[],
    orderId: string,
    labels: Map<string, string>,
  ): Promise<void> {
    const ordered = [...lines].sort((a, b) => a.produit_id.localeCompare(b.produit_id));

    for (const line of ordered) {
      const stock = await manager
        .createQueryBuilder(StockEntity, 'stock')
        .setLock('pessimistic_write')
        .where('stock.produit_id = :produit AND stock.boutique_id = :boutique', {
          produit: line.produit_id,
          boutique: boutiqueId,
        })
        .getOne();

      const label = labels.get(line.produit_id) || line.produit_id;

      if (!stock || stock.quantite < line.quantite) {
        throw new ConflictException(
          `Stock insuffisant pour « ${label} » : ${stock?.quantite ?? 0} disponible(s), ${line.quantite} demandé(s).`,
        );
      }

      const nouvelleQuantite = stock.quantite - line.quantite;

      await manager.update(
        StockEntity,
        { produit_id: line.produit_id, boutique_id: boutiqueId },
        { quantite: nouvelleQuantite },
      );

      await manager.save(
        manager.create(StockMovementEntity, {
          produit_id: line.produit_id,
          boutique_id: boutiqueId,
          delta: -line.quantite,
          quantiteApres: nouvelleQuantite,
          reason: StockMovementReason.ORDER_RESERVED,
          orderId,
        }),
      );
    }
  }

  /** Remet en stock les quantités d'une commande annulée ou retournée. */
  async release(
    manager: EntityManager,
    boutiqueId: string,
    lines: StockLine[],
    orderId: string,
    userId?: string,
  ): Promise<void> {
    for (const line of lines) {
      const stock = await manager
        .createQueryBuilder(StockEntity, 'stock')
        .setLock('pessimistic_write')
        .where('stock.produit_id = :produit AND stock.boutique_id = :boutique', {
          produit: line.produit_id,
          boutique: boutiqueId,
        })
        .getOne();

      if (!stock) {
        // La ligne de stock a disparu (produit retiré du catalogue).
        // On la recrée pour ne pas perdre les unités retournées.
        this.logger.warn(
          `Ligne de stock absente pour ${line.produit_id} @ ${boutiqueId} — recréation.`,
        );
        await manager.save(
          manager.create(StockEntity, {
            produit_id: line.produit_id,
            boutique_id: boutiqueId,
            quantite: line.quantite,
          }),
        );
        continue;
      }

      const nouvelleQuantite = stock.quantite + line.quantite;

      await manager.update(
        StockEntity,
        { produit_id: line.produit_id, boutique_id: boutiqueId },
        { quantite: nouvelleQuantite },
      );

      await manager.save(
        manager.create(StockMovementEntity, {
          produit_id: line.produit_id,
          boutique_id: boutiqueId,
          delta: line.quantite,
          quantiteApres: nouvelleQuantite,
          reason: StockMovementReason.ORDER_RELEASED,
          orderId,
          userId,
        }),
      );
    }
  }

  /** Ajustement manuel depuis le back-office. */
  async adjust(
    manager: EntityManager,
    produitId: string,
    boutiqueId: string,
    nouvelleQuantite: number,
    userId: string,
  ): Promise<StockEntity> {
    const stock = await manager
      .createQueryBuilder(StockEntity, 'stock')
      .setLock('pessimistic_write')
      .where('stock.produit_id = :produit AND stock.boutique_id = :boutique', {
        produit: produitId,
        boutique: boutiqueId,
      })
      .getOne();

    const ancienne = stock?.quantite ?? 0;

    const saved = await manager.save(
      manager.create(StockEntity, {
        produit_id: produitId,
        boutique_id: boutiqueId,
        quantite: nouvelleQuantite,
      }),
    );

    await manager.save(
      manager.create(StockMovementEntity, {
        produit_id: produitId,
        boutique_id: boutiqueId,
        delta: nouvelleQuantite - ancienne,
        quantiteApres: nouvelleQuantite,
        reason: StockMovementReason.MANUAL_ADJUSTMENT,
        userId,
      }),
    );

    return saved;
  }
}
