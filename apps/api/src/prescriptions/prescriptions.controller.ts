import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto, UpdatePrescriptionDto } from './dto/prescription.dto';
import { JwtAuthGuard, OptionalJwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { UserRole } from '../entities/user.entity';

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionsService) {}

  /**
   * Dépôt d'une ordonnance ou d'une liste de matériel. Ouvert aux invités,
   * rattaché au compte si le client est connecté.
   * Le fichier reste en mémoire (`memoryStorage`) le temps d'être validé,
   * puis écrit hors de l'arborescence publique.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024, files: 1 } }))
  create(
    @Body() dto: CreatePrescriptionDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.prescriptions.create(dto, file, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.prescriptions.findMine(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.prescriptions.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePrescriptionDto) {
    return this.prescriptions.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/file')
  async file(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { stream, mimeType } = await this.prescriptions.streamFile(id, user);
    res.setHeader('Content-Type', mimeType);
    // `attachment` empêche un SVG ou un HTML déguisé de s'exécuter dans le navigateur.
    res.setHeader('Content-Disposition', 'attachment');
    stream.pipe(res);
  }
}
