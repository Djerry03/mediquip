import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../entities/order.entity';
import {
  ALLOWED_TRANSITIONS,
  assertTransition,
  CUSTOMER_CANCELLABLE_STATES,
  STOCK_RESERVED_STATES,
} from './order-status';

describe('machine à états des commandes', () => {
  it('accepte le parcours nominal', () => {
    const parcours = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
    ];

    for (let i = 0; i < parcours.length - 1; i++) {
      expect(() => assertTransition(parcours[i], parcours[i + 1])).not.toThrow();
    }
  });

  it('refuse de sauter une étape', () => {
    expect(() => assertTransition(OrderStatus.PENDING, OrderStatus.DELIVERED)).toThrow(
      BadRequestException,
    );
    expect(() => assertTransition(OrderStatus.PENDING, OrderStatus.SHIPPED)).toThrow(
      BadRequestException,
    );
  });

  it('refuse de revenir en arrière', () => {
    expect(() => assertTransition(OrderStatus.SHIPPED, OrderStatus.PREPARING)).toThrow(
      BadRequestException,
    );
    expect(() => assertTransition(OrderStatus.DELIVERED, OrderStatus.SHIPPED)).toThrow(
      BadRequestException,
    );
  });

  it('refuse toute sortie d’un état terminal', () => {
    for (const terminal of [OrderStatus.CANCELLED, OrderStatus.RETURNED]) {
      expect(ALLOWED_TRANSITIONS[terminal]).toHaveLength(0);
      for (const cible of Object.values(OrderStatus)) {
        if (cible === terminal) continue;
        expect(() => assertTransition(terminal, cible)).toThrow(BadRequestException);
      }
    }
  });

  it('refuse une transition vers le même état', () => {
    expect(() => assertTransition(OrderStatus.CONFIRMED, OrderStatus.CONFIRMED)).toThrow(
      BadRequestException,
    );
  });

  it('permet l’annulation jusqu’à l’expédition incluse', () => {
    for (const depart of [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.SHIPPED,
    ]) {
      expect(() => assertTransition(depart, OrderStatus.CANCELLED)).not.toThrow();
    }
    // Une commande déjà livrée se retourne, elle ne s'annule plus.
    expect(() => assertTransition(OrderStatus.DELIVERED, OrderStatus.CANCELLED)).toThrow();
  });

  it('libère le stock dès qu’on quitte un état réservé', () => {
    expect(STOCK_RESERVED_STATES).toContain(OrderStatus.PENDING);
    expect(STOCK_RESERVED_STATES).toContain(OrderStatus.DELIVERED);
    expect(STOCK_RESERVED_STATES).not.toContain(OrderStatus.CANCELLED);
    expect(STOCK_RESERVED_STATES).not.toContain(OrderStatus.RETURNED);
  });

  it('n’autorise l’annulation par le client qu’avant la préparation', () => {
    expect(CUSTOMER_CANCELLABLE_STATES).toEqual([OrderStatus.PENDING, OrderStatus.CONFIRMED]);
    expect(CUSTOMER_CANCELLABLE_STATES).not.toContain(OrderStatus.PREPARING);
  });
});
