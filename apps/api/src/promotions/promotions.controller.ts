import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PromotionsService } from './promotions.service';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
  ValidatePromotionDto,
} from './dto/promotion.dto';
import { JwtAuthGuard, OptionalJwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { UserRole } from '../entities/user.entity';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  /**
   * Vérification d'un code depuis le panier. Limité pour empêcher
   * l'énumération des codes valides par force brute.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  @HttpCode(200)
  @Post('validate')
  validate(@Body() dto: ValidatePromotionDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.promotions.validate(dto.code, dto.itemsTotal, dto.shippingFee ?? 0, user?.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.promotions.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreatePromotionDto) {
    return this.promotions.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotions.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promotions.remove(id);
  }
}
