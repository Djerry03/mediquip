import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import {
  EmailCampaignDeliveryEntity,
  EmailCampaignDeliveryStatus,
} from '../entities/email-campaign-delivery.entity';
import {
  CampaignAudience,
  CampaignStatus,
  EmailCampaignEntity,
} from '../entities/email-campaign.entity';
import { UserEntity } from '../entities/user.entity';
import { OrderStatus } from '../entities/order.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import {
  CreateEmailCampaignDto,
  TestSendDto,
  UpdateEmailCampaignDto,
} from './dto/email-campaign.dto';

/** Taille des lots d'envoi : ménage le serveur SMTP et lisse la charge. */
const BATCH_SIZE = 25;
const BATCH_PAUSE_MS = 1_000;

@Injectable()
export class EmailCampaignsService implements OnModuleInit {
  private readonly logger = new Logger(EmailCampaignsService.name);
  private readonly runningCampaigns = new Set<string>();

  constructor(
    @InjectRepository(EmailCampaignEntity)
    private readonly campaigns: Repository<EmailCampaignEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(EmailCampaignDeliveryEntity)
    private readonly deliveries: Repository<EmailCampaignDeliveryEntity>,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Les envois n'ont pas besoin d'un processus séparé pour reprendre après
   * une relance : les destinataires et leur état sont dans PostgreSQL. Les
   * messages déjà confirmés restent `sent`; seules les lignes interrompues
   * sont remises dans la file.
   */
  async onModuleInit() {
    try {
      const interrupted = await this.campaigns.find({
        where: { status: CampaignStatus.SENDING },
      });

      for (const campaign of interrupted) {
        await this.deliveries.update(
          { campaignId: campaign.id, status: EmailCampaignDeliveryStatus.SENDING },
          { status: EmailCampaignDeliveryStatus.PENDING },
        );
        void this.deliver(campaign.id);
      }

      if (interrupted.length > 0) {
        this.logger.warn(`${interrupted.length} campagne(s) e-mail reprise(s) après redémarrage.`);
      }
    } catch (error) {
      // La disponibilité du catalogue ne doit pas dépendre d'une reprise
      // d'e-mails. L'alerte permet toutefois d'intervenir sans perdre la file.
      this.logger.error(`Reprise des campagnes impossible : ${(error as Error).message}`);
    }
  }

  // ------------------------------------------------------------- Audience

  /**
   * Destinataires d'une audience.
   *
   * Le filtre `newsletterOptIn` est commun à toutes les audiences et n'est
   * jamais contournable : une campagne commerciale ne part que vers des
   * clients qui l'ont explicitement demandée.
   */
  private audienceQuery(audience: CampaignAudience) {
    const qb = this.users
      .createQueryBuilder('u')
      .where('u."newsletterOptIn" = true')
      .andWhere('u.email IS NOT NULL');

    // `orders."userId"` est une colonne texte (la commande peut être passée
    // sans compte) : la comparaison avec l'uuid de `users` impose un cast.
    switch (audience) {
      case CampaignAudience.BUYERS:
        return qb.andWhere(
          `EXISTS (
             SELECT 1 FROM orders o
             WHERE o."userId" = u.id::text AND o.status = :delivered
           )`,
          { delivered: OrderStatus.DELIVERED },
        );

      case CampaignAudience.DORMANT:
        return qb.andWhere(
          `NOT EXISTS (
             SELECT 1 FROM orders o
             WHERE o."userId" = u.id::text
               AND o.status = :delivered
               AND o."createdAt" > NOW() - INTERVAL '90 days'
           )`,
          { delivered: OrderStatus.DELIVERED },
        );

      default:
        return qb;
    }
  }

  /** Compte les destinataires sans rien envoyer — affiché avant l'envoi. */
  async audienceSize(audience: CampaignAudience): Promise<number> {
    return this.audienceQuery(audience).getCount();
  }

  async audienceSizes(): Promise<Record<CampaignAudience, number>> {
    const entries = await Promise.all(
      Object.values(CampaignAudience).map(
        async (a) => [a, await this.audienceSize(a)] as const,
      ),
    );
    return Object.fromEntries(entries) as Record<CampaignAudience, number>;
  }

  // ------------------------------------------------------------ Brouillons

  findAll(): Promise<EmailCampaignEntity[]> {
    return this.campaigns.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<EmailCampaignEntity> {
    const campaign = await this.campaigns.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campagne introuvable.');
    return campaign;
  }

  create(dto: CreateEmailCampaignDto): Promise<EmailCampaignEntity> {
    return this.campaigns.save(
      this.campaigns.create({ ...dto, status: CampaignStatus.DRAFT }),
    );
  }

  async update(id: string, dto: UpdateEmailCampaignDto): Promise<EmailCampaignEntity> {
    const campaign = await this.findOne(id);

    // Une campagne partie est un fait daté : la modifier après coup
    // rendrait le journal d'envoi mensonger.
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException(
        'Cette campagne a déjà été envoyée : dupliquez-la plutôt que de la modifier.',
      );
    }

    Object.assign(campaign, dto);
    return this.campaigns.save(campaign);
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const campaign = await this.findOne(id);

    if (campaign.status === CampaignStatus.SENDING) {
      throw new BadRequestException('Envoi en cours : impossible de supprimer maintenant.');
    }

    await this.campaigns.remove(campaign);
    return { deleted: true };
  }

  /** Repart d'une campagne existante pour en écrire une nouvelle. */
  async duplicate(id: string): Promise<EmailCampaignEntity> {
    const source = await this.findOne(id);

    return this.campaigns.save(
      this.campaigns.create({
        name: `${source.name} (copie)`,
        subject: source.subject,
        body: source.body,
        audience: source.audience,
        status: CampaignStatus.DRAFT,
      }),
    );
  }

  // ----------------------------------------------------------------- Envoi

  /** Envoi d'essai vers une seule adresse, sans toucher au statut. */
  async sendTest(id: string, dto: TestSendDto) {
    const campaign = await this.findOne(id);

    const sent = await this.notifications.send({
      to: dto.email,
      subject: `[TEST] ${campaign.subject}`,
      text: this.renderBody(campaign, 'https://exemple/desinscription?token=apercu'),
    });

    return { sent, to: dto.email };
  }

  /**
   * Envoie la campagne à toute son audience.
   *
   * Les destinataires sont d'abord persistés, puis traités par lots en
   * arrière-plan : un redémarrage n'abandonne donc ni ne renvoie les e-mails
   * dont l'expédition a déjà été confirmée.
   */
  async send(id: string, admin: AuthenticatedUser): Promise<EmailCampaignEntity> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Cette campagne a déjà été envoyée.');
    }

    const recipients = await this.audienceQuery(campaign.audience).getMany();
    if (recipients.length === 0) {
      throw new BadRequestException(
        'Aucun destinataire : personne n’est inscrit à la newsletter dans cette audience.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      campaign.status = CampaignStatus.SENDING;
      campaign.recipientCount = recipients.length;
      campaign.sentCount = 0;
      campaign.failedCount = 0;
      campaign.sentByEmail = admin.email;
      campaign.lastError = undefined;
      await manager.save(campaign);

      await manager
        .createQueryBuilder()
        .insert()
        .into(EmailCampaignDeliveryEntity)
        .values(
          recipients.map((user) => ({
            campaignId: campaign.id,
            userId: user.id,
            status: EmailCampaignDeliveryStatus.PENDING,
            attempts: 0,
          })),
        )
        // L'index unique garantit qu'un éventuel rejeu de la requête admin
        // ne crée jamais deux lignes pour le même destinataire.
        .orIgnore()
        .execute();
    });

    // Volontairement non attendu : la réponse HTTP part immédiatement.
    void this.deliver(campaign.id);

    return campaign;
  }

  private async deliver(campaignId: string) {
    if (this.runningCampaigns.has(campaignId)) return;
    this.runningCampaigns.add(campaignId);

    try {
      const campaign = await this.findOne(campaignId);
      let processed = 0;

      for (;;) {
        const delivery = await this.claimNextDelivery(campaignId);
        if (!delivery) break;

        await this.deliverRecipient(campaign, delivery);
        processed++;

        if (processed % BATCH_SIZE === 0) {
          await this.refreshCounters(campaignId);
          await new Promise((resolve) => setTimeout(resolve, BATCH_PAUSE_MS));
        }
      }

      const counters = await this.refreshCounters(campaignId, true);
      this.logger.log(
        `Campagne « ${campaign.name} » : ${counters.sent} envoyé(s), ${counters.failed} échec(s).`,
      );
    } catch (error) {
      await this.campaigns.update(campaignId, {
        status: CampaignStatus.FAILED,
        lastError: (error as Error).message,
      });
      this.logger.error(`Campagne ${campaignId} interrompue : ${(error as Error).message}`);
    } finally {
      this.runningCampaigns.delete(campaignId);
    }
  }

  /** Réserve une ligne à traiter, de façon exclusive même avec plusieurs processus API. */
  private async claimNextDelivery(campaignId: string): Promise<EmailCampaignDeliveryEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      const delivery = await manager
        .createQueryBuilder(EmailCampaignDeliveryEntity, 'delivery')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('delivery."campaignId" = :campaignId', { campaignId })
        .andWhere('delivery.status = :status', { status: EmailCampaignDeliveryStatus.PENDING })
        .orderBy('delivery."createdAt"', 'ASC')
        .getOne();

      if (!delivery) return null;

      delivery.status = EmailCampaignDeliveryStatus.SENDING;
      delivery.attempts += 1;
      return manager.save(delivery);
    });
  }

  private async deliverRecipient(
    campaign: EmailCampaignEntity,
    delivery: EmailCampaignDeliveryEntity,
  ) {
    const user = await this.users.findOne({ where: { id: delivery.userId } });

    // Une désinscription intervenue après la constitution de l'audience doit
    // être respectée jusqu'à la dernière seconde avant l'envoi.
    if (!user?.email || !user.newsletterOptIn) {
      await this.deliveries.update(delivery.id, { status: EmailCampaignDeliveryStatus.SKIPPED });
      return;
    }

    try {
      const token = await this.ensureUnsubscribeToken(user);
      const sent = await this.notifications.send({
        to: user.email,
        subject: campaign.subject,
        text: this.renderBody(campaign, this.unsubscribeUrl(token), user.fullName),
      });

      if (sent) {
        await this.deliveries.update(delivery.id, {
          status: EmailCampaignDeliveryStatus.SENT,
          sentAt: new Date(),
        });
      } else {
        await this.deliveries.update(delivery.id, {
          status: EmailCampaignDeliveryStatus.FAILED,
          lastError: 'Le transport e-mail a rejeté le message.',
        });
      }
    } catch (error) {
      await this.deliveries.update(delivery.id, {
        status: EmailCampaignDeliveryStatus.FAILED,
        lastError: (error as Error).message,
      });
      this.logger.warn(
        `Campagne ${campaign.id} : échec pour ${user.email} — ${(error as Error).message}`,
      );
    }
  }

  private async refreshCounters(campaignId: string, completed = false) {
    const [sent, failed] = await Promise.all([
      this.deliveries.count({ where: { campaignId, status: EmailCampaignDeliveryStatus.SENT } }),
      this.deliveries.count({ where: { campaignId, status: EmailCampaignDeliveryStatus.FAILED } }),
    ]);

    await this.campaigns.update(campaignId, {
      sentCount: sent,
      failedCount: failed,
      ...(completed ? { status: CampaignStatus.SENT, sentAt: new Date() } : {}),
    });

    return { sent, failed };
  }

  /**
   * Le pied de page de désinscription est ajouté par le service, pas saisi
   * par l'administrateur : impossible d'envoyer une campagne sans lui.
   */
  private renderBody(
    campaign: EmailCampaignEntity,
    unsubscribeUrl: string,
    fullName?: string,
  ): string {
    const greeting = fullName ? `Bonjour ${fullName.split(' ')[0]},\n\n` : '';

    return [
      `${greeting}${campaign.body.trim()}`,
      '',
      '—',
      'Mediquipe — matériel médical à Yaoundé',
      `Vous recevez cet e-mail parce que vous vous êtes inscrit à nos actualités.`,
      `Pour ne plus les recevoir : ${unsubscribeUrl}`,
    ].join('\n');
  }

  private unsubscribeUrl(token: string): string {
    const base = this.config.get<string>('NEXT_PUBLIC_SITE_URL', 'http://localhost:3004');
    return `${base}/desinscription?token=${token}`;
  }

  private async ensureUnsubscribeToken(user: UserEntity): Promise<string> {
    if (user.unsubscribeToken) return user.unsubscribeToken;

    const token = randomBytes(24).toString('hex');
    await this.users.update(user.id, { unsubscribeToken: token });
    return token;
  }

  // ---------------------------------------------------------- Désinscription

  /**
   * Désinscription en un clic depuis l'e-mail. Idempotente : recliquer sur
   * un lien déjà utilisé confirme simplement que c'est bien fait, plutôt que
   * d'afficher une erreur incompréhensible.
   */
  async unsubscribe(token: string): Promise<{ unsubscribed: true; email: string }> {
    if (!token) throw new BadRequestException('Lien de désinscription incomplet.');

    const user = await this.users.findOne({ where: { unsubscribeToken: token } });
    if (!user) throw new NotFoundException('Ce lien de désinscription n’est plus valide.');

    if (user.newsletterOptIn) {
      await this.users.update(user.id, { newsletterOptIn: false, newsletterOptInAt: null as any });
    }

    return { unsubscribed: true, email: user.email };
  }
}
