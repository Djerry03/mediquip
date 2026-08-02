import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EmailCampaignsService } from './email-campaigns.service';
import {
  CreateEmailCampaignDto,
  TestSendDto,
  UpdateEmailCampaignDto,
} from './dto/email-campaign.dto';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { UserRole } from '../entities/user.entity';

@Controller()
export class EmailCampaignsController {
  constructor(private readonly campaigns: EmailCampaignsService) {}

  /**
   * Désinscription publique, atteinte depuis le lien d'un e-mail : elle ne
   * peut pas exiger de connexion, sinon elle serait inutilisable.
   */
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @HttpCode(200)
  @Post('marketing/unsubscribe')
  unsubscribe(@Body('token') token: string) {
    return this.campaigns.unsubscribe(token);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('email-campaigns')
  findAll() {
    return this.campaigns.findAll();
  }

  /** Effectif de chaque audience, affiché avant de choisir la cible. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('email-campaigns/audiences')
  audiences() {
    return this.campaigns.audienceSizes();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('email-campaigns')
  create(@Body() dto: CreateEmailCampaignDto) {
    return this.campaigns.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('email-campaigns/:id')
  update(@Param('id') id: string, @Body() dto: UpdateEmailCampaignDto) {
    return this.campaigns.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('email-campaigns/:id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.campaigns.duplicate(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('email-campaigns/:id/test')
  sendTest(@Param('id') id: string, @Body() dto: TestSendDto) {
    return this.campaigns.sendTest(id, dto);
  }

  /** Envoi réel. Plafonné : une campagne partie ne se rattrape pas. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 3_600_000, limit: 20 } })
  @Post('email-campaigns/:id/send')
  send(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.campaigns.send(id, admin);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('email-campaigns/:id')
  remove(@Param('id') id: string) {
    return this.campaigns.remove(id);
  }
}
