import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentEntity, PaymentMethod } from '../../entities/payment.entity';
import { PaymentInstruction, PaymentProvider, WebhookResult } from '../payment-provider';

/**
 * Fournisseur par défaut, actif tant qu'aucun contrat marchand n'est branché.
 *
 * Il ne débite personne : il produit la marche à suivre (paiement à la
 * livraison, ou transfert Mobile Money vers le numéro de la boutique) et
 * l'encaissement est confirmé à la main depuis le back-office. C'est
 * exactement le fonctionnement actuel du commerce, simplement tracé.
 */
@Injectable()
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = 'manual';

  async initiate(payment: PaymentEntity): Promise<PaymentInstruction> {
    if (payment.method === PaymentMethod.CASH_ON_DELIVERY) {
      return {
        provider: this.name,
        reference: payment.id,
        instructions: `Vous réglerez ${payment.amount.toLocaleString('fr-FR')} FCFA en espèces à la réception de votre commande.`,
        requiresCustomerAction: false,
      };
    }

    return {
      provider: this.name,
      reference: payment.id,
      instructions: [
        `Effectuez un transfert Mobile Money de ${payment.amount.toLocaleString('fr-FR')} FCFA`,
        'vers le numéro que notre équipe vous communiquera par téléphone,',
        `en indiquant la référence ${payment.orderId}.`,
        'Votre commande est confirmée dès réception du paiement.',
      ].join(' '),
      requiresCustomerAction: true,
    };
  }

  async parseWebhook(): Promise<WebhookResult> {
    // Aucun fournisseur externe ne notifie ce mode : accepter un webhook ici
    // reviendrait à laisser n'importe qui marquer une commande comme payée.
    throw new BadRequestException(
      'Aucun webhook n’est accepté avec PAYMENT_PROVIDER=manual. Confirmez le paiement depuis le back-office.',
    );
  }
}
