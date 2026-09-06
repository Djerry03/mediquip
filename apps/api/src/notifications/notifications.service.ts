import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { OrderEntity, OrderStatus } from '../entities/order.entity';

export type Message = {
  to: string;
  subject: string;
  text: string;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'reçue, en attente de confirmation',
  [OrderStatus.CONFIRMED]: 'confirmée',
  [OrderStatus.PREPARING]: 'en préparation',
  [OrderStatus.SHIPPED]: 'en cours de livraison',
  [OrderStatus.DELIVERED]: 'livrée',
  [OrderStatus.CANCELLED]: 'annulée',
  [OrderStatus.RETURNED]: 'retournée',
};

/**
 * Envoi de notifications.
 *
 * Deux transports :
 *  - `log`  : écrit dans les journaux du serveur. Aucun compte requis,
 *             c'est le mode par défaut en développement.
 *  - `smtp` : envoie réellement les e-mails via nodemailer.
 *
 * Un échec d'envoi ne fait jamais échouer l'opération métier appelante :
 * une commande valide ne doit pas être perdue parce que le SMTP est tombé.
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (this.config.get<string>('NOTIFICATION_TRANSPORT', 'log') !== 'smtp') {
      this.logger.log('Transport de notification : log (aucun e-mail réel ne sera envoyé).');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: Number(this.config.get<string>('SMTP_PORT', '587')),
      secure: Number(this.config.get<string>('SMTP_PORT', '587')) === 465,
      auth: this.config.get<string>('SMTP_USER')
        ? {
            user: this.config.get<string>('SMTP_USER'),
            pass: this.config.get<string>('SMTP_PASSWORD'),
          }
        : undefined,
    });
    this.logger.log('Transport de notification : SMTP.');
  }

  /**
   * Retourne le résultat du transport sans laisser une notification faire
   * échouer l'opération métier. Les campagnes e-mail peuvent ainsi compter
   * et signaler les échecs au lieu de les masquer.
   */
  async send(message: Message): Promise<boolean> {
    if (!message.to) return false;

    try {
      if (!this.transporter) {
        this.logger.log(
          `[notification simulée] à ${message.to} — ${message.subject}\n${message.text}`,
        );
        // Le transport `log` est utile en développement, mais une campagne
        // ne doit jamais être marquée comme réellement distribuée dans ce
        // mode.
        return false;
      }

      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'Mediquipe <no-reply@mediquipe.cm>'),
        to: message.to,
        subject: message.subject,
        text: message.text,
      });
      return true;
    } catch (err) {
      this.logger.error(
        `Échec d'envoi de la notification à ${message.to} : ${(err as Error).message}`,
      );
      return false;
    }
  }

  // ------------------------------------------------------------- Modèles

  async notifyOrderCreated(order: OrderEntity, trackingUrl: string) {
    const reception =
      order.mode_reception === 'retrait'
        ? `Retrait en boutique — code : ${order.code_retrait}`
        : `Livraison à ${order.address}`;

    if (order.email) {
      await this.send({
        to: order.email,
        subject: `Commande ${order.id} bien reçue`,
        text: [
          `Bonjour ${order.client},`,
          '',
          `Nous avons bien reçu votre commande ${order.id}.`,
          `Montant total : ${order.total.toLocaleString('fr-FR')} FCFA`,
          reception,
          '',
          `Suivez votre commande ici : ${trackingUrl}`,
          '',
          "Notre équipe vous appelle pour confirmer avant l'expédition.",
          '',
          'Mediquipe',
        ].join('\n'),
      });
    }

    // L'équipe doit être prévenue même si le client n'a pas laissé d'e-mail :
    // sans cela, personne ne sait qu'il y a un colis à préparer.
    const ops = this.config.get<string>('OPS_NOTIFICATION_EMAIL');
    if (ops) {
      await this.send({
        to: ops,
        subject: `Nouvelle commande ${order.id} — ${order.total.toLocaleString('fr-FR')} FCFA`,
        text: [
          `Client : ${order.client} (${order.phone})`,
          reception,
          `Articles : ${order.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}`,
          `Paiement : ${order.paymentMethod} (${order.paymentStatus})`,
          order.requiresPrescription ? '⚠️ Ordonnance requise — à vérifier.' : '',
          order.note ? `Note client : ${order.note}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    }
  }

  async notifyOrderStatusChanged(order: OrderEntity, trackingUrl: string) {
    if (!order.email) return;

    await this.send({
      to: order.email,
      subject: `Commande ${order.id} : ${STATUS_LABELS[order.status]}`,
      text: [
        `Bonjour ${order.client},`,
        '',
        `Votre commande ${order.id} est ${STATUS_LABELS[order.status]}.`,
        order.status === OrderStatus.CANCELLED && order.cancellationReason
          ? `Motif : ${order.cancellationReason}`
          : '',
        '',
        `Détail : ${trackingUrl}`,
        '',
        'Mediquipe',
      ]
        .filter(Boolean)
        .join('\n'),
    });
  }

  async notifyPaymentReceived(order: OrderEntity, amount: number) {
    if (!order.email) return;

    await this.send({
      to: order.email,
      subject: `Paiement reçu pour la commande ${order.id}`,
      text: [
        `Bonjour ${order.client},`,
        '',
        `Nous confirmons la réception de ${amount.toLocaleString('fr-FR')} FCFA pour la commande ${order.id}.`,
        '',
        'Merci de votre confiance.',
        'Mediquipe',
      ].join('\n'),
    });
  }
}
