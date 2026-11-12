import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

export interface AuditEntry {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  /**
   * Mudanças minimizadas (ids, estados, horários). Nunca enviar dados pessoais
   * completos nem segredos.
   */
  changes?: Prisma.InputJsonValue;
}

/**
 * Registra a trilha de auditoria dentro da MESMA transação da operação auditada,
 * para que alteração e auditoria sejam atômicas (AGENTS.md — Engenharia).
 */
@Injectable()
export class AuditService {
  async record(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
    await tx.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        reason: entry.reason,
        changes: entry.changes,
      },
    });
  }
}
