import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { PaymentEntity } from '../../entities/payment.entity';
import { PaymentInstruction, PaymentProvider, WebhookResult } from '../payment-provider';

/**
 * MTN Mobile Money — API Collections (Request To Pay).
 *
 * Nécessite un compte marchand MTN MoMo et les identifiants correspondants
 * (cf. MOMO_* dans .env.example). Le flux est :
 *   1. obtention d'un jeton d'accès ;
 *   2. `requesttopay` : le client reçoit une invite sur son téléphone ;
 *   3. MTN notifie le callback, ou l'on interroge `checkStatus`.
 *
 * Le statut n'est jamais déduit de la réponse initiale : seul un
 * `SUCCESSFUL` confirmé par MTN vaut encaissement.
 */
@Injectable()
export class MomoPaymentProvider implements PaymentProvider {
  readonly name = 'momo';
  private readonly logger = new Logger(MomoPaymentProvider.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return (this.config.get<string>('MOMO_API_BASE_URL') || '').replace(/\/$/, '');
  }

  private async accessToken(): Promise<string> {
    const user = this.config.get<string>('MOMO_API_USER');
    const key = this.config.get<string>('MOMO_API_KEY');
    const basic = Buffer.from(`${user}:${key}`).toString('base64');

    const res = await fetch(`${this.baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Ocp-Apim-Subscription-Key': this.config.get<string>('MOMO_SUBSCRIPTION_KEY') || '',
      },
    });

    if (!res.ok) {
      throw new BadRequestException(
        `Authentification Mobile Money refusée (HTTP ${res.status}).`,
      );
    }

    const body = (await res.json()) as { access_token: string };
    return body.access_token;
  }

  async initiate(payment: PaymentEntity, payerPhone?: string): Promise<PaymentInstruction> {
    const phone = (payerPhone || payment.payerPhone || '').replace(/^\+/, '');
    if (!phone) {
      throw new BadRequestException('Un numéro Mobile Money est nécessaire pour ce paiement.');
    }

    const referenceId = randomUUID();
    const token = await this.accessToken();

    const res = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': this.config.get<string>('MOMO_TARGET_ENVIRONMENT', 'sandbox'),
        'Ocp-Apim-Subscription-Key': this.config.get<string>('MOMO_SUBSCRIPTION_KEY') || '',
        'X-Callback-Url': this.config.get<string>('MOMO_CALLBACK_URL') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: String(payment.amount),
        currency: payment.currency,
        externalId: payment.orderId,
        payer: { partyIdType: 'MSISDN', partyId: phone },
        payerMessage: `Commande Mediquipe ${payment.orderId}`,
        payeeNote: `Mediquipe ${payment.orderId}`,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      this.logger.error(`requesttopay refusé (HTTP ${res.status}) : ${detail}`);
      throw new BadRequestException(
        'Le paiement Mobile Money n’a pas pu être initié. Réessayez ou choisissez le paiement à la livraison.',
      );
    }

    return {
      provider: this.name,
      reference: referenceId,
      instructions:
        'Validez la demande de paiement reçue sur votre téléphone (saisissez votre code Mobile Money). La commande est confirmée dès validation.',
      requiresCustomerAction: true,
    };
  }

  /**
   * Vérifie la signature HMAC du webhook avant toute interprétation :
   * sans cela, n'importe qui pourrait déclarer une commande payée.
   */
  async parseWebhook(headers: Record<string, any>, body: any): Promise<WebhookResult> {
    const secret = this.config.get<string>('PAYMENT_WEBHOOK_SECRET');
    const signature = String(headers['x-signature'] || headers['x-momo-signature'] || '');

    if (!secret) {
      throw new UnauthorizedException('PAYMENT_WEBHOOK_SECRET non configuré : webhook rejeté.');
    }

    const expected = createHmac('sha256', secret)
      .update(typeof body === 'string' ? body : JSON.stringify(body))
      .digest('hex');

    const provided = Buffer.from(signature, 'utf8');
    const computed = Buffer.from(expected, 'utf8');

    if (provided.length !== computed.length || !timingSafeEqual(provided, computed)) {
      throw new UnauthorizedException('Signature de webhook invalide.');
    }

    const payload = typeof body === 'string' ? JSON.parse(body) : body;
    const status = String(payload.status || '').toUpperCase();

    return {
      reference: payload.referenceId || payload.externalId,
      succeeded: status === 'SUCCESSFUL',
      failureReason: status === 'SUCCESSFUL' ? undefined : payload.reason || status,
      raw: payload,
    };
  }

  async checkStatus(payment: PaymentEntity): Promise<WebhookResult> {
    const token = await this.accessToken();
    const res = await fetch(
      `${this.baseUrl}/collection/v1_0/requesttopay/${payment.providerReference}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Target-Environment': this.config.get<string>('MOMO_TARGET_ENVIRONMENT', 'sandbox'),
          'Ocp-Apim-Subscription-Key': this.config.get<string>('MOMO_SUBSCRIPTION_KEY') || '',
        },
      },
    );

    const payload = (await res.json()) as { status?: string; reason?: string };
    const status = String(payload.status || '').toUpperCase();

    return {
      reference: payment.providerReference || '',
      succeeded: status === 'SUCCESSFUL',
      failureReason: status === 'SUCCESSFUL' ? undefined : payload.reason || status,
      raw: payload,
    };
  }
}
