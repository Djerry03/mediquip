import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createReadStream, existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { randomUUID } from 'crypto';
import {
  PrescriptionRequestEntity,
  PrescriptionStatus,
} from '../entities/prescription-request.entity';
import { UserRole } from '../entities/user.entity';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePrescriptionDto, UpdatePrescriptionDto } from './dto/prescription.dto';

/** Types réellement acceptés — la liste blanche prime sur l'extension du fichier. */
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

/**
 * Signatures binaires des formats acceptés. Un fichier dont l'en-tête ne
 * correspond pas à son type déclaré est rejeté : le `Content-Type` fourni
 * par le navigateur n'est qu'une déclaration, pas une preuve.
 */
const MAGIC_NUMBERS: { mime: string; bytes: number[] }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
];

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(PrescriptionRequestEntity)
    private readonly requests: Repository<PrescriptionRequestEntity>,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  /** Répertoire de stockage, hors de l'arborescence servie publiquement. */
  private get uploadDir(): string {
    return resolve(process.cwd(), 'uploads', 'prescriptions');
  }

  private assertAcceptable(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');

    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(
        'Format non accepté. Envoyez une photo (JPEG, PNG, WebP) ou un PDF.',
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('Fichier trop volumineux (8 Mo maximum).');
    }

    const signature = MAGIC_NUMBERS.find((m) => m.mime === file.mimetype);
    if (signature) {
      const header = Array.from(file.buffer.subarray(0, signature.bytes.length));
      if (!signature.bytes.every((b, i) => header[i] === b)) {
        throw new BadRequestException(
          'Le contenu du fichier ne correspond pas à son format annoncé.',
        );
      }
    }
  }

  async create(
    dto: CreatePrescriptionDto,
    file: Express.Multer.File,
    user?: AuthenticatedUser,
  ) {
    this.assertAcceptable(file);

    await mkdir(this.uploadDir, { recursive: true });

    // Le nom d'origine n'est jamais réutilisé : il peut contenir « ../ »
    // ou une double extension destinée à tromper le serveur.
    const storedFileName = `${randomUUID()}${extname(file.originalname).slice(0, 8).toLowerCase()}`;
    await writeFile(join(this.uploadDir, storedFileName), file.buffer, { mode: 0o600 });

    const request = await this.requests.save(
      this.requests.create({
        userId: user?.id,
        clientName: dto.clientName,
        phone: dto.phone,
        email: dto.email,
        note: dto.note,
        storedFileName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        status: PrescriptionStatus.RECEIVED,
      }),
    );

    const ops = this.config.get<string>('OPS_NOTIFICATION_EMAIL');
    if (ops) {
      await this.notifications.send({
        to: ops,
        subject: `Nouvelle demande de devis ${request.id.slice(0, 8)}`,
        text: [
          `Client : ${dto.clientName} (${dto.phone})`,
          dto.email ? `E-mail : ${dto.email}` : '',
          dto.note ? `Note : ${dto.note}` : '',
          'Le document est consultable depuis le back-office.',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    }

    // On ne renvoie jamais le nom du fichier stocké au client.
    return {
      id: request.id,
      status: request.status,
      message:
        'Votre demande a bien été reçue. Notre équipe vous contacte sous 24h avec un devis.',
    };
  }

  findMine(userId: string) {
    return this.requests.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      select: ['id', 'status', 'note', 'createdAt', 'adminNote'],
    });
  }

  findAll() {
    return this.requests.find({ order: { createdAt: 'DESC' } });
  }

  async update(id: string, dto: UpdatePrescriptionDto) {
    const request = await this.requests.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Demande introuvable.');

    Object.assign(request, dto);
    return this.requests.save(request);
  }

  /**
   * Flux du document. Contient une donnée de santé : accessible au seul
   * propriétaire et aux administrateurs, jamais par URL publique devinable.
   */
  async streamFile(id: string, user: AuthenticatedUser) {
    const request = await this.requests.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Demande introuvable.');

    if (user.role !== UserRole.ADMIN && request.userId !== user.id) {
      throw new ForbiddenException('Accès refusé.');
    }

    const path = join(this.uploadDir, request.storedFileName);
    if (!existsSync(path)) throw new NotFoundException('Document introuvable.');

    return { stream: createReadStream(path), mimeType: request.mimeType };
  }
}
