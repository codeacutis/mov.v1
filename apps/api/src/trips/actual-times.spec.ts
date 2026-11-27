import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from './trips.service';
import { TripStatus } from '../generated/prisma/client';

describe('Correção de horários reais', () => {
  const record = jest.fn();
  const tx = { $executeRaw: jest.fn(), trip: { findUnique: jest.fn(), update: jest.fn() } };
  const prisma = { $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) } as unknown as PrismaService;
  const service = new TripsService(prisma, { record } as unknown as AuditService);
  beforeEach(() => {
    jest.clearAllMocks();
    tx.trip.findUnique.mockResolvedValue({ status: TripStatus.COMPLETED, actualDepartureAt: new Date('2025-01-01T09:00:00Z'), actualReturnStartAt: new Date('2025-01-01T12:00:00Z'), actualReturnAt: new Date('2025-01-01T15:00:00Z') });
    tx.trip.update.mockResolvedValue({ id: 'trip' });
  });
  it('registra valores anteriores e novos com justificativa na mesma transação', async () => {
    await service.correctActualTimes('admin', 'trip', { actualDepartureAt: '2025-01-01T08:30:00Z', reason: 'Correção conferida' });
    expect(tx.trip.update).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(tx, expect.objectContaining({ actorUserId: 'admin', entityId: 'trip', action: 'TRIP_ACTUAL_TIMES_CORRECTED', reason: 'Correção conferida', changes: { before: { actualDepartureAt: '2025-01-01T09:00:00.000Z' }, after: { actualDepartureAt: '2025-01-01T08:30:00.000Z' } } }));
  });
  it.each([
    { actualDepartureAt: '2025-01-01T16:00:00Z', reason: 'Teste' },
    { actualDepartureAt: '2025-01-01T08:00:00Z', reason: '  ' },
    { actualReturnAt: '2099-01-01T08:00:00Z', reason: 'Teste' },
    { actualDepartureAt: '2025-01-01T09:00:00Z', reason: 'Teste' },
  ])('rejeita dados inválidos sem registrar alteração', async dto => {
    await expect(service.correctActualTimes('admin', 'trip', dto)).rejects.toThrow();
    expect(tx.trip.update).not.toHaveBeenCalled(); expect(record).not.toHaveBeenCalled();
  });
  it('não permite criar um horário que ainda não foi registrado', async () => {
    tx.trip.findUnique.mockResolvedValue({ actualDepartureAt: null, actualReturnStartAt: null, actualReturnAt: null });
    await expect(service.correctActualTimes('admin', 'trip', { actualDepartureAt: '2025-01-01T08:00:00Z', reason: 'Teste' })).rejects.toThrow();
    expect(record).not.toHaveBeenCalled();
  });
  it('propaga falhas de auditoria para a transação', async () => {
    record.mockRejectedValueOnce(new Error('falha'));
    await expect(service.correctActualTimes('admin', 'trip', { actualDepartureAt: '2025-01-01T08:30:00Z', reason: 'Teste' })).rejects.toThrow('falha');
  });
});
