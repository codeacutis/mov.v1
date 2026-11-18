import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../generated/prisma/client';
import { AuthUser } from './auth.types';
import { AUTHENTICATED_KEY, IS_PUBLIC_KEY, ROLES_KEY } from './decorators';

/**
 * Autorização por papel no backend, com política FAIL-CLOSED: toda rota precisa
 * declarar explicitamente @Public(), @Authenticated() ou @Roles(...). Uma rota
 * esquecida é negada (403) em vez de ficar aberta a qualquer usuário logado.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user) throw new ForbiddenException('Sem permissão para esta operação');

    // @Roles tem precedência: método sobrescreve a classe.
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      targets,
    );
    if (required !== undefined) {
      if (!required.includes(user.role)) {
        throw new ForbiddenException('Sem permissão para esta operação');
      }
      return true;
    }

    if (this.reflector.getAllAndOverride<boolean>(AUTHENTICATED_KEY, targets)) {
      return true;
    }

    this.logger.error(
      `Rota sem política de acesso declarada: ${context.getClass().name}.${context.getHandler().name}`,
    );
    throw new ForbiddenException('Sem permissão para esta operação');
  }
}
