import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto, UpdateOrderStatusDto } from './dto/update-order.dto';
import { JwtAuthGuard, OptionalJwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { OrderStatus } from '../entities/order.entity';
import { UserRole } from '../entities/user.entity';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /**
   * Création de commande. Ouverte aux invités, mais rattachée au compte
   * quand un jeton valide est présent.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 600_000, limit: 20 } })
  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.orders.create(dto, user);
  }

  /** Commandes du client connecté. */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.orders.findMine(user.id);
  }

  /**
   * Back-office. Cette route remplace l'ancien `GET /orders` public, qui
   * exposait le carnet d'adresses complet des clients.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin')
  listForAdmin(
    @Query('status') status?: OrderStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orders.findAllForAdmin({
      status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * Consultation d'une commande. Un invité doit fournir le jeton de suivi
   * reçu à l'achat (`?token=`) ; le numéro seul ne donne accès à rien.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.orders.findOneFor(id, user, token);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.cancelByCustomer(id, user, dto.reason);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.orders.updateStatus(id, dto.status, admin, dto.note);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/prescription-verified')
  verifyPrescription(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.orders.markPrescriptionVerified(id, admin);
  }
}
