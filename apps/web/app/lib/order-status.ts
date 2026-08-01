/** Libellés partagés des statuts de commande — alignés sur l'enum de l'API. */
export const ORDER_STATUS_LABELS = {
  pending: { fr: 'Reçue', en: 'Received' },
  confirmed: { fr: 'Confirmée', en: 'Confirmed' },
  preparing: { fr: 'En préparation', en: 'Preparing' },
  shipped: { fr: 'En livraison', en: 'Out for delivery' },
  delivered: { fr: 'Livrée', en: 'Delivered' },
  cancelled: { fr: 'Annulée', en: 'Cancelled' },
  returned: { fr: 'Retournée', en: 'Returned' },
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS_LABELS;

/** Étapes du fil de suivi présenté au client (les états d'échec en sont exclus). */
export const TRACKING_STEPS: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
];

export const PAYMENT_STATUS_LABELS = {
  pending: { fr: 'En attente', en: 'Pending' },
  succeeded: { fr: 'Payée', en: 'Paid' },
  failed: { fr: 'Échec', en: 'Failed' },
  cancelled: { fr: 'Annulé', en: 'Cancelled' },
  refunded: { fr: 'Remboursé', en: 'Refunded' },
} as const;

export const PAYMENT_METHOD_LABELS = {
  cash_on_delivery: { fr: 'À la livraison', en: 'Cash on delivery' },
  mobile_money: { fr: 'Mobile Money', en: 'Mobile Money' },
} as const;
