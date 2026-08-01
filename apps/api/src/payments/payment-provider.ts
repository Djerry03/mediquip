import { PaymentEntity } from '../entities/payment.entity';

/** Instruction rendue au client pour qu'il finalise son paiement. */
export type PaymentInstruction = {
  provider: string;
  /** Référence à rapprocher côté fournisseur. */
  reference: string;
  /** Message affiché au client (code USSD, marche à suivre…). */
  instructions: string;
  /** URL de redirection si le fournisseur en impose une. */
  redirectUrl?: string;
  /** Vrai si le client doit valider sur son téléphone. */
  requiresCustomerAction: boolean;
};

export type WebhookResult = {
  reference: string;
  succeeded: boolean;
  failureReason?: string;
  raw: unknown;
};

/**
 * Contrat commun à tous les moyens de paiement. Brancher un nouvel opérateur
 * (Orange Money, un agrégateur…) consiste à implémenter cette interface et à
 * l'enregistrer dans PaymentsService — sans toucher au tunnel de commande.
 */
export interface PaymentProvider {
  readonly name: string;

  /** Démarre un encaissement pour un paiement déjà créé en base. */
  initiate(payment: PaymentEntity, payerPhone?: string): Promise<PaymentInstruction>;

  /**
   * Interprète une notification entrante du fournisseur.
   * Doit lever si la signature est invalide.
   */
  parseWebhook(headers: Record<string, any>, body: any): Promise<WebhookResult>;

  /** Interroge le fournisseur sur l'état réel d'un paiement. */
  checkStatus?(payment: PaymentEntity): Promise<WebhookResult>;
}
