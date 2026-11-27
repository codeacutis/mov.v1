import { AuditController } from './audit.controller';
import { ROLES_KEY } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

describe('Consulta de auditoria', () => {
  it('exige ADMIN e aplica filtros e paginação', async () => {
    expect(Reflect.getMetadata(ROLES_KEY, AuditController)).toEqual([Role.ADMIN]);
    const findMany = jest.fn().mockResolvedValue([]); const count = jest.fn().mockResolvedValue(42);
    const controller = new AuditController({ auditLog: { findMany, count } } as unknown as PrismaService);
    const result = await controller.list({ page: 2, limit: 20, q: 'ana', action: 'TRIP', entityType: 'Trip', start: '2025-01-01T00:00:00Z', end: '2025-02-01T00:00:00Z' });
    expect(result).toMatchObject({ total: 42, page: 2, limit: 20 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20, where: expect.objectContaining({ action: { contains: 'TRIP', mode: 'insensitive' }, entityType: { contains: 'Trip', mode: 'insensitive' }, occurredAt: { gte: new Date('2025-01-01T00:00:00Z'), lt: new Date('2025-02-01T00:00:00Z') } }) }));
  });
  it('rejeita período invertido antes da consulta', async () => {
    const findMany = jest.fn(); const controller = new AuditController({ auditLog: { findMany } } as unknown as PrismaService);
    await expect(controller.list({ start: '2025-02-01', end: '2025-01-01' })).rejects.toThrow();
    expect(findMany).not.toHaveBeenCalled();
  });
});
