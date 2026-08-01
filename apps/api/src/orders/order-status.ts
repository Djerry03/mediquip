import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../entities/order.entity';

/**
 * Machine à états du cycle de vie d'une commande.
 * Toute transition non listée ici est refusée : impossible de « livrer »
 * une commande annulée ou de faire revenir une commande livrée en préparation.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.RETURNED]: [],
};

/** États dans lesquels le stock est réservé (et doit être libéré si on en sort). */
export const STOCK_RESERVED_STATES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

/** États dans lesquels le client peut encore annuler lui-même. */
export const CUSTOMER_CANCELLABLE_STATES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
];

export const TERMINAL_STATES: OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.RETURNED];

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) {
    throw new BadRequestException(`La commande est déjà au statut « ${to} ».`);
  }
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new BadRequestException(
      `Transition impossible : « ${from} » → « ${to} ». Transitions autorisées : ${
        ALLOWED_TRANSITIONS[from]?.join(', ') || 'aucune (état terminal)'
      }.`,
    );
  }
}
