import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './auth.types';

// Hash descartável para igualar o custo de tempo quando o e-mail não existe
// (evita enumeração de contas por diferença de tempo de resposta).
const DUMMY_HASH = bcrypt.hashSync('nao-e-uma-senha-real', 10);

@Injectable()
export class AuthService {
  private readonly sessionTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.sessionTtlSeconds = Number(
      config.get<string>('SESSION_TTL_SECONDS') ?? 3600,
    );
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    const passwordOk = await bcrypt.compare(
      password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !user.isActive || !passwordOk) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const expiresAt = new Date(Date.now() + this.sessionTtlSeconds * 1000);
    const session = await this.prisma.session.create({
      data: { userId: user.id, expiresAt },
      select: { id: true },
    });

    const payload: JwtPayload = { sub: user.id, sid: session.id };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.sessionTtlSeconds,
    });
    return { accessToken, expiresAt };
  }

  /** Revoga a sessão atual: o token deixa de valer imediatamente. */
  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
