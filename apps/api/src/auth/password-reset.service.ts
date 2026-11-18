import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordResetNotifier } from './password-reset.notifier';

const BCRYPT_COST = 12;
/** Intervalo mínimo entre solicitações para o mesmo usuário (anti-flood). */
const REQUEST_COOLDOWN_MS = 60_000;
const INVALID_TOKEN_MESSAGE = 'Token inválido ou expirado';

export const sha256Hex = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class PasswordResetService {
  private readonly ttlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifier: PasswordResetNotifier,
    config: ConfigService,
  ) {
    this.ttlMs =
      Number(config.get<string>('PASSWORD_RESET_TTL_SECONDS') ?? 1800) * 1000;
  }

  /**
   * Solicita a recuperação. A resposta ao cliente é sempre a mesma, exista ou
   * não a conta, para não permitir enumeração de e-mails.
   */
  async request(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, isActive: true },
    });
    if (!user || !user.isActive) return;

    const now = new Date();
    const token = randomBytes(32).toString('base64url');

    const created = await this.prisma.$transaction(async (tx) => {
      const recent = await tx.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          createdAt: { gt: new Date(now.getTime() - REQUEST_COOLDOWN_MS) },
        },
        select: { id: true },
      });
      if (recent) return false;

      // Uma solicitação nova invalida as anteriores ainda pendentes.
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: now } },
        data: { expiresAt: now },
      });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256Hex(token),
          expiresAt: new Date(now.getTime() + this.ttlMs),
        },
      });
      await this.audit.record(tx, {
        actorUserId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: user.id,
      });
      return true;
    });

    if (!created) return;
    // Não aguardamos a entrega: iguala a latência com o caso "conta inexistente".
    void this.notifier
      .send({ email: user.email, name: user.name, token })
      .catch(() => undefined);
  }

  /**
   * Redefine a senha. O token é consumido por um UPDATE condicional atômico
   * (usedAt IS NULL AND expiresAt > now), o que impede reutilização mesmo com
   * requisições simultâneas.
   */
  async reset(token: string, newPassword: string): Promise<void> {
    // Calculado antes da transação: custo constante e sem segurar a conexão.
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    const tokenHash = sha256Hex(token);

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const consumed = await tx.passwordResetToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) {
        throw new BadRequestException(INVALID_TOKEN_MESSAGE);
      }

      const record = await tx.passwordResetToken.findUniqueOrThrow({
        where: { tokenHash },
        select: { userId: true, user: { select: { isActive: true } } },
      });
      if (!record.user.isActive) {
        throw new BadRequestException(INVALID_TOKEN_MESSAGE);
      }

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      // Encerra todas as sessões abertas e invalida outros tokens pendentes.
      await tx.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: now },
      });
      await this.audit.record(tx, {
        actorUserId: record.userId,
        action: 'PASSWORD_RESET_COMPLETED',
        entityType: 'User',
        entityId: record.userId,
      });
    });
  }
}
