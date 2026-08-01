import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from '../entities/user.entity';

export type JwtPayload = { sub: string; email: string; role: UserRole };

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
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
    if (!user) throw new UnauthorizedException('Compte introuvable ou supprimé.');

    return { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
  }
}
