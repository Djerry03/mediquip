import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { UserRole } from '../entities/user.entity';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * Point d'entrée des notifications fournisseur. Public par nature — la
   * confiance repose entièrement sur la signature vérifiée dans le provider.
   */
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @HttpCode(200)
  @Post('webhook')
  webhook(@Headers() headers: Record<string, any>, @Body() body: any) {
    return this.payments.handleWebhook(headers, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('order/:orderId')
  byOrder(@Param('orderId') orderId: string) {
    return this.payments.findByOrder(orderId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/confirm')
  confirm(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.payments.confirmManually(id, admin);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/fail')
  fail(@Param('id') id: string, @Body('reason') reason: string) {
    return this.payments.markFailed(id, reason || 'Échec constaté par l’équipe.');
  }
}
