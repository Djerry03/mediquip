import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CampaignPagesService } from './campaign-pages.service';
import { CreateCampaignPageDto, UpdateCampaignPageDto } from './dto/campaign-page.dto';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { UserRole } from '../entities/user.entity';

@Controller('campaign-pages')
export class CampaignPagesController {
  constructor(private readonly pages: CampaignPagesService) {}

  /** Adresses en ligne — utilisé pour le sitemap et le pré-rendu. */
  @Get('live')
  liveSlugs() {
    return this.pages.findLiveSlugs();
  }

  // `admin` avant `:slug`, sinon il serait pris pour une adresse de page.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin')
  findAll() {
    return this.pages.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateCampaignPageDto) {
    return this.pages.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCampaignPageDto) {
    return this.pages.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.pages.togglePublished(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pages.remove(id);
  }

  /** Page publique. Déclarée en dernier pour ne pas capturer les routes ci-dessus. */
  @Get(':slug')
  findLive(@Param('slug') slug: string) {
    return this.pages.findLiveBySlug(slug);
  }
}
