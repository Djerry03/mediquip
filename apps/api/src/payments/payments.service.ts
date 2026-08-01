import { forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from '../entities/order.entity';
import { PaymentEntity, PaymentMethod, PaymentStatus } from '../entities/payment.entity';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentInstruction, PaymentProvider } from './payment-provider';
import { ManualPaymentProvider } from './providers/manual.provider';
import { MomoPaymentProvider } from './providers/momo.provider';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly payments: Repository<PaymentEntity>,
    private readonly config: ConfigService,
    private readonly manual: ManualPaymentProvider,
    private readonly momo: MomoPaymentProvider,
    private readonly notifications: NotificationsService,
    // Dépendance circulaire assumée : la commande crée le paiement,
    // le paiement met à jour la commande.
    @Inject(forwardRef(() => OrdersService))
    private readonly orders: OrdersService,
  ) {}

  /**
   * Fournisseur effectif. Le paiement à la livraison passe toujours par le
   * fournisseur manuel, même si un opérateur Mobile Money est configuré.
   */
  private providerFor(method: PaymentMethod): PaymentProvider {
    if (method === PaymentMethod.CASH_ON_DELIVERY) return this.manual;
    return this.config.get<string>('PAYMENT_PROVIDER', 'manual') === 'momo'
      ? this.momo
      : this.manual;
  }

  async initiateForOrder(
    order: OrderEntity,
    payerPhone?: string,
  ): Promise<PaymentInstruction & { paymentId: string }> {
    const provider = this.providerFor(order.paymentMethod);

    const payment = await this.payments.save(
      this.payments.create({
        orderId: order.id,
        method: order.paymentMethod,
        status: PaymentStatus.PENDING,
        amount: order.total,
        currency: 'XAF',
        provider: provider.name,
        payerPhone: payerPhone || order.phone,
      }),
    );

    const instruction = await provider.initiate(payment, payerPhone);

    payment.providerReference = instruction.reference;
    await this.payments.save(payment);

    return { ...instruction, paymentId: payment.id };
  }

  /** Notification entrante du fournisseur. La signature est vérifiée par le provider. */
  async handleWebhook(headers: Record<string, any>, body: any) {
    const providerName = this.config.get<string>('PAYMENT_PROVIDER', 'manual');
    const provider = providerName === 'momo' ? this.momo : this.manual;

    const result = await provider.parseWebhook(headers, body);

    const payment = await this.payments.findOne({
      where: { providerReference: result.reference },
    });
    if (!payment) {
      this.logger.warn(`Webhook reçu pour une référence inconnue : ${result.reference}`);
      // 200 volontaire : le fournisseur ne doit pas réessayer indéfiniment
      // pour une référence qui n'existera jamais chez nous.
      return { received: true, matched: false };
    }

    // Les webhooks peuvent être rejoués : ne rien faire si déjà traité.
    if (payment.status !== PaymentStatus.PENDING) {
      return { received: true, matched: true, alreadyProcessed: true };
    }

    await this.settle(payment, result.succeeded, result.failureReason, result.raw);
    return { received: true, matched: true };
  }

  /** Confirmation manuelle d'un encaissement depuis le back-office. */
  async confirmManually(paymentId: string, admin: AuthenticatedUser) {
    const payment = await this.payments.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Paiement introuvable.');

    payment.confirmedByUserId = admin.id;
    await this.settle(payment, true, undefined, { confirmedBy: admin.email });

    return payment;
  }

  async markFailed(paymentId: string, reason: string) {
    const payment = await this.payments.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Paiement introuvable.');

    await this.settle(payment, false, reason, null);
    return payment;
  }

  findByOrder(orderId: string) {
    return this.payments.find({ where: { orderId }, order: { createdAt: 'DESC' } });
  }

  private async settle(
    payment: PaymentEntity,
    succeeded: boolean,
    failureReason?: string,
    raw?: unknown,
  ) {
    payment.status = succeeded ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;
    payment.failureReason = failureReason;
    payment.providerPayload = raw ?? payment.providerPayload;
    payment.paidAt = succeeded ? new Date() : undefined;
    await this.payments.save(payment);

    const order = await this.orders.applyPaymentStatus(payment.orderId, payment.status);

    if (succeeded && order) {
      await this.notifications.notifyPaymentReceived(order, payment.amount);
    }
  }
}
