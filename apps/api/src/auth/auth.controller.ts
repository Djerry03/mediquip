import { Body, Controller, Get, HttpCode, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards';
import { CurrentUser } from './current-user.decorator';
import { AuthenticatedUser } from './jwt.strategy';
import { SESSION_COOKIE_NAME } from './session-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private sessionCookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/api',
    };
  }

  // Plafonds resserrés : ces routes sont les cibles naturelles du
  // bourrage d'identifiants et de la création de comptes en masse.
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.register(dto);
    res.cookie(SESSION_COOKIE_NAME, token, this.sessionCookieOptions());
    return { user };
  }

  @Throttle({ default: { ttl: 900_000, limit: 10 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.login(dto);
    res.cookie(SESSION_COOKIE_NAME, token, this.sessionCookieOptions());
    return { user };
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
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, ...result } = await this.auth.changePassword(user.id, dto);
    res.cookie(SESSION_COOKIE_NAME, token, this.sessionCookieOptions());
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('logout')
  async logout(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(user.id);
    res.clearCookie(SESSION_COOKIE_NAME, this.sessionCookieOptions());
    return { ok: true };
  }
}
