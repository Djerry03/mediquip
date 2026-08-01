import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards';
import { CurrentUser } from './current-user.decorator';
import { AuthenticatedUser } from './jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Plafonds resserrés : ces routes sont les cibles naturelles du
  // bourrage d'identifiants et de la création de comptes en masse.
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Throttle({ default: { ttl: 900_000, limit: 10 } })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 900_000, limit: 5 } })
  @Post('me/password')
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto);
  }
}
