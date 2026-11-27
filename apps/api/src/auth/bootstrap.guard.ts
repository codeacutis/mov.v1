import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class BootstrapGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    if (this.config.get<string>('NODE_ENV') !== 'production') return true;
    const expected = this.config.get<string>('BOOTSTRAP_SECRET');
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const provided = request.headers['x-bootstrap-secret'];
    if (typeof expected !== 'string' || expected.length < 32 || typeof provided !== 'string') throw new ForbiddenException('Inicialização indisponível.');
    const left = Buffer.from(expected); const right = Buffer.from(provided);
    if (left.length !== right.length || !timingSafeEqual(left, right)) throw new ForbiddenException('Inicialização indisponível.');
    return true;
  }
}
