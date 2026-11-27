import { AuditController } from './audit.controller';
import { ROLES_KEY } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

describe('Consulta de auditoria', () => {
  it('obtém opções distintas de toda a trilha, sem payloads ou dados pessoais', async () => {
    const groupBy = jest.fn().mockResolvedValueOnce([{ action: 'PATIENT_CREATED' }, { action: 'TRIP_CREATED' }]).mockResolvedValueOnce([{ entityType: 'Patient' }, { entityType: 'Trip' }]);
    const controller = new AuditController({ auditLog: { groupBy } } as unknown as PrismaService);
    expect(await controller.options()).toEqual({ actions: ['PATIENT_CREATED', 'TRIP_CREATED'], entityTypes: ['Patient', 'Trip'] });
    expect(groupBy.mock.calls).toEqual([[{ by: ['action'], orderBy: { action: 'asc' } }], [{ by: ['entityType'], orderBy: { entityType: 'asc' } }]]);
  });
  it('exige ADMIN e aplica filtros e paginação', async () => {
    expect(Reflect.getMetadata(ROLES_KEY, AuditController)).toEqual([Role.ADMIN]);
    const findMany = jest.fn().mockResolvedValue([]); const count = jest.fn().mockResolvedValue(42);
    const controller = new AuditController({ auditLog: { findMany, count } } as unknown as PrismaService);
    const result = await controller.list({ page: 2, limit: 20, q: 'ana', action: 'TRIP', entityType: 'Trip', start: '2025-01-01T00:00:00Z', end: '2025-02-01T00:00:00Z' });
    expect(result).toMatchObject({ total: 42, page: 2, limit: 20 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20, where: expect.objectContaining({ action: { equals: 'TRIP', mode: 'insensitive' }, entityType: { equals: 'Trip', mode: 'insensitive' }, occurredAt: { gte: new Date('2025-01-01T00:00:00Z'), lt: new Date('2025-02-01T00:00:00Z') } }) }));
  });
  it('rejeita período invertido antes da consulta', async () => {
    const findMany = jest.fn(); const controller = new AuditController({ auditLog: { findMany } } as unknown as PrismaService);
    await expect(controller.list({ start: '2025-02-01', end: '2025-01-01' })).rejects.toThrow();
    expect(findMany).not.toHaveBeenCalled();
  });
});
