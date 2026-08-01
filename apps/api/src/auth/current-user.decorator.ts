import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from './jwt.strategy';

/** Injecte l'utilisateur authentifié (ou `undefined` avec OptionalJwtAuthGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined =>
    ctx.switchToHttp().getRequest().user,
);
