import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Role } from '../generated/prisma/client';
import { AuthUser } from './auth.types';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const AUTHENTICATED_KEY = 'authenticatedAnyRole';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
/**
 * Rota aberta a QUALQUER usuário autenticado, de qualquer papel. Precisa ser
 * declarada explicitamente: rota sem @Public, @Roles ou @Authenticated é negada.
 */
export const Authenticated = () => SetMetadata(AUTHENTICATED_KEY, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
