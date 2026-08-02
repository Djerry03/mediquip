import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
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
export class EmailCampaignsService {
  private readonly logger = new Logger(EmailCampaignsService.name);

  constructor(
    @InjectRepository(EmailCampaignEntity)
    private readonly campaigns: Repository<EmailCampaignEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

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

    await this.notifications.send({
      to: dto.email,
      subject: `[TEST] ${campaign.subject}`,
      text: this.renderBody(campaign, 'https://exemple/desinscription?token=apercu'),
    });

    return { sent: true, to: dto.email };
  }

  /**
   * Envoie la campagne à toute son audience.
   *
   * Le traitement se fait par lots, en arrière-plan : l'administrateur n'a
   * pas à garder son onglet ouvert, et un millier de destinataires ne bloque
   * pas la requête HTTP.
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

    campaign.status = CampaignStatus.SENDING;
    campaign.recipientCount = recipients.length;
    campaign.sentCount = 0;
    campaign.failedCount = 0;
    campaign.sentByEmail = admin.email;
    await this.campaigns.save(campaign);

    // Volontairement non attendu : la réponse HTTP part immédiatement.
    void this.deliver(campaign, recipients);

    return campaign;
  }

  private async deliver(campaign: EmailCampaignEntity, recipients: UserEntity[]) {
    let sent = 0;
    let failed = 0;

    try {
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (user) => {
            try {
              const token = await this.ensureUnsubscribeToken(user);
              await this.notifications.send({
                to: user.email,
                subject: campaign.subject,
                text: this.renderBody(campaign, this.unsubscribeUrl(token), user.fullName),
              });
              sent++;
            } catch (err) {
              failed++;
              this.logger.warn(
                `Campagne ${campaign.id} : échec pour ${user.email} — ${(err as Error).message}`,
              );
            }
          }),
        );

        await this.campaigns.update(campaign.id, { sentCount: sent, failedCount: failed });

        if (i + BATCH_SIZE < recipients.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_PAUSE_MS));
        }
      }

      await this.campaigns.update(campaign.id, {
        status: CampaignStatus.SENT,
        sentCount: sent,
        failedCount: failed,
        sentAt: new Date(),
      });

      this.logger.log(`Campagne « ${campaign.name} » : ${sent} envoyé(s), ${failed} échec(s).`);
    } catch (err) {
      await this.campaigns.update(campaign.id, {
        status: CampaignStatus.FAILED,
        sentCount: sent,
        failedCount: failed,
        lastError: (err as Error).message,
      });
      this.logger.error(`Campagne ${campaign.id} interrompue : ${(err as Error).message}`);
    }
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
