import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from '../entities/user.entity';
import { extractSessionCookie } from './session-cookie';

export type JwtPayload = { sub: string; sv: number };

/** Utilisateur attaché à la requête après authentification. */
export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {
    super({
      // Le navigateur utilise un cookie HttpOnly. L'en-tête Bearer reste
      // accepté pour les clients d'API non-navigateur.
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        extractSessionCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Le rôle est relu en base à chaque requête plutôt que d'être cru sur
   * parole depuis le jeton : révoquer un accès admin prend effet
   * immédiatement, sans attendre l'expiration du token.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || user.sessionVersion !== payload.sv) {
      throw new UnauthorizedException('Session expirée, déconnectée ou compte supprimé.');
    }

    return { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
  }
}
