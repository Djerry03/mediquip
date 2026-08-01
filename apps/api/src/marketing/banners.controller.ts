import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BannersService } from './banners.service';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { UserRole } from '../entities/user.entity';
import { BannerPlacement } from '../entities/banner.entity';

@Controller('banners')
export class BannersController {
  constructor(private readonly banners: BannersService) {}

  /** Flux public consommé par le bandeau, l'accueil, le catalogue et le panier. */
  @Get()
  findActive(@Query('placement') placement?: BannerPlacement) {
    return this.banners.findActive(placement);
  }

  // `admin` avant `:id`, sinon il serait pris pour un identifiant.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin')
  findAll() {
    return this.banners.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateBannerDto) {
    return this.banners.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.banners.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.banners.toggle(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.banners.remove(id);
  }
}
