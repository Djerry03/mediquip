import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '../entities/user.entity';

/** Authentification obligatoire : 401 si le jeton manque ou est invalide. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/**
 * Authentification facultative : renseigne `req.user` si un jeton valide est
 * présent, laisse passer sinon. Utilisé pour les commandes invité, qui
 * doivent être rattachées au compte quand le client est connecté.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return err || !user ? undefined : user;
  }
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Accès réservé.');
    }
    return true;
  }
}
