import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompanionsService } from './companions.service';

describe('Auditoria de acompanhantes', () => {
  const record = jest.fn();
  const tx = {
    $executeRaw: jest.fn(),
    patientTrip: { findUnique: jest.fn(), count: jest.fn() },
    trip: { findUnique: jest.fn() },
    tripCompanion: { count: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const service = new CompanionsService({ $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) } as unknown as PrismaService, { record } as unknown as AuditService);
  beforeEach(() => {
    jest.clearAllMocks();
    tx.patientTrip.findUnique.mockResolvedValue({ id: 'part', tripId: 'trip', cancelledAt: null, trip: { status: 'SCHEDULED' } });
    tx.trip.findUnique.mockResolvedValue({ vehicle: { capacity: 5 } });
    tx.patientTrip.count.mockResolvedValue(1); tx.tripCompanion.count.mockResolvedValue(0);
    tx.tripCompanion.findUnique.mockResolvedValue({ id: 'comp', patientTripId: 'part', removedAt: null });
    tx.tripCompanion.create.mockResolvedValue({ id: 'comp' }); tx.tripCompanion.update.mockResolvedValue({ id: 'comp' });
  });
  it('registra inclusão, alteração e remoção sem nomes ou telefones', async () => {
    await service.create('part', { name: 'Nome fictício', phone: '000000000' }, 'admin');
    await service.update('part', 'comp', { phone: '111111111' }, 'admin');
    await service.remove('part', 'comp', 'admin');
    expect(record.mock.calls.map(call => call[1].action)).toEqual(['COMPANION_CREATED', 'COMPANION_UPDATED', 'COMPANION_REMOVED']);
    for (const call of record.mock.calls) {
      expect(call[0]).toBe(tx); expect(call[1]).toMatchObject({ actorUserId: 'admin', entityId: 'comp', changes: { patientTripId: 'part' } });
      expect(JSON.stringify(call[1])).not.toMatch(/Nome fictício|000000000|111111111/);
    }
  });
  it('não registra sucesso quando a alteração é recusada', async () => {
    tx.patientTrip.findUnique.mockResolvedValue({ id: 'part', tripId: 'trip', cancelledAt: null, trip: { status: 'COMPLETED' } });
    await expect(service.remove('part', 'comp', 'admin')).rejects.toThrow();
    expect(tx.tripCompanion.update).not.toHaveBeenCalled(); expect(record).not.toHaveBeenCalled();
  });
});
