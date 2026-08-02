import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  CampaignAudience,
  CampaignStatus,
  EmailCampaignEntity,
} from '../entities/email-campaign.entity';
import { UserEntity } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailCampaignsService } from './email-campaigns.service';

const campaign = (patch: Partial<EmailCampaignEntity> = {}): EmailCampaignEntity =>
  ({
    id: 'c1',
    name: 'Rentrée',
    subject: 'Nos offres',
    body: 'Le contenu de la campagne.',
    audience: CampaignAudience.NEWSLETTER,
    status: CampaignStatus.DRAFT,
    recipientCount: 0,
    sentCount: 0,
    failedCount: 0,
    ...patch,
  }) as EmailCampaignEntity;

describe('EmailCampaignsService', () => {
  let service: EmailCampaignsService;
  let campaigns: Record<string, jest.Mock>;
  let users: Record<string, jest.Mock>;
  let notifications: { send: jest.Mock };
  let queryBuilder: Record<string, jest.Mock>;

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
    };

    campaigns = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
      create: jest.fn((entity) => entity),
      update: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({}),
    };

    users = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    };

    notifications = { send: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        EmailCampaignsService,
        { provide: getRepositoryToken(EmailCampaignEntity), useValue: campaigns },
        { provide: getRepositoryToken(UserEntity), useValue: users },
        { provide: NotificationsService, useValue: notifications },
        { provide: ConfigService, useValue: { get: () => 'https://mediquipe.cm' } },
      ],
    }).compile();

    service = module.get(EmailCampaignsService);
  });

  describe('consentement', () => {
    it('filtre systématiquement sur le consentement, quelle que soit l’audience', async () => {
      for (const audience of Object.values(CampaignAudience)) {
        queryBuilder.where.mockClear();
        await service.audienceSize(audience);
        expect(queryBuilder.where).toHaveBeenCalledWith('u."newsletterOptIn" = true');
      }
    });

    it('restreint l’audience « acheteurs » aux commandes livrées', async () => {
      await service.audienceSize(CampaignAudience.BUYERS);

      const clause = queryBuilder.andWhere.mock.calls.map((c) => c[0]).join(' ');
      expect(clause).toContain('EXISTS');
      expect(clause).toContain('orders');
    });

    it('cible les dormants par absence de commande récente', async () => {
      await service.audienceSize(CampaignAudience.DORMANT);

      const clause = queryBuilder.andWhere.mock.calls.map((c) => c[0]).join(' ');
      expect(clause).toContain('NOT EXISTS');
      expect(clause).toContain("INTERVAL '90 days'");
    });
  });

  describe('cycle de vie', () => {
    it('refuse de modifier une campagne déjà envoyée', async () => {
      campaigns.findOne.mockResolvedValue(campaign({ status: CampaignStatus.SENT }));

      await expect(service.update('c1', { subject: 'Nouveau' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('autorise la modification d’un brouillon', async () => {
      campaigns.findOne.mockResolvedValue(campaign());

      await expect(service.update('c1', { subject: 'Nouveau' })).resolves.toMatchObject({
        subject: 'Nouveau',
      });
    });

    it('refuse un second envoi', async () => {
      campaigns.findOne.mockResolvedValue(campaign({ status: CampaignStatus.SENT }));

      await expect(
        service.send('c1', { id: 'a', email: 'admin@x.cm', role: 'admin' as any, fullName: 'A' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuse d’envoyer à une audience vide', async () => {
      campaigns.findOne.mockResolvedValue(campaign());
      queryBuilder.getMany.mockResolvedValue([]);

      await expect(
        service.send('c1', { id: 'a', email: 'admin@x.cm', role: 'admin' as any, fullName: 'A' }),
      ).rejects.toThrow(/Aucun destinataire/);
    });

    it('duplique en brouillon, sans reprendre les compteurs d’envoi', async () => {
      campaigns.findOne.mockResolvedValue(
        campaign({ status: CampaignStatus.SENT, sentCount: 120, recipientCount: 130 }),
      );

      const copy = await service.duplicate('c1');

      expect(copy.status).toBe(CampaignStatus.DRAFT);
      expect(copy.name).toContain('copie');
      expect(copy.sentCount ?? 0).toBe(0);
    });

    it('refuse de supprimer pendant un envoi', async () => {
      campaigns.findOne.mockResolvedValue(campaign({ status: CampaignStatus.SENDING }));

      await expect(service.remove('c1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('désinscription', () => {
    it('désabonne le porteur du jeton', async () => {
      users.findOne.mockResolvedValue({
        id: 'u1',
        email: 'client@x.cm',
        newsletterOptIn: true,
      });

      const result = await service.unsubscribe('jeton-valide');

      expect(result.unsubscribed).toBe(true);
      expect(users.update).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ newsletterOptIn: false }),
      );
    });

    it('reste idempotente sur un compte déjà désabonné', async () => {
      users.findOne.mockResolvedValue({
        id: 'u1',
        email: 'client@x.cm',
        newsletterOptIn: false,
      });

      await expect(service.unsubscribe('jeton')).resolves.toMatchObject({ unsubscribed: true });
      expect(users.update).not.toHaveBeenCalled();
    });

    it('rejette un jeton inconnu', async () => {
      users.findOne.mockResolvedValue(null);
      await expect(service.unsubscribe('inconnu')).rejects.toThrow(NotFoundException);
    });

    it('rejette un jeton vide', async () => {
      await expect(service.unsubscribe('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('rendu du message', () => {
    it('ajoute toujours le lien de désinscription, même en envoi d’essai', async () => {
      campaigns.findOne.mockResolvedValue(campaign());

      await service.sendTest('c1', { email: 'moi@mediquipe.cm' });

      const [message] = notifications.send.mock.calls[0];
      expect(message.subject).toContain('[TEST]');
      expect(message.text).toContain('desinscription');
      expect(message.text).toContain('Mediquipe');
    });
  });
});
