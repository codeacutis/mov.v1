import { ConflictException } from '@nestjs/common';
import { PatientTripsService } from './patient-trips.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { tripOccupancy } from '../common/operational-integrity';
import { Prisma } from '../generated/prisma/client';

describe('Participation history', () => {
  function setup(status = 'SCHEDULED', cancelledAt: Date | null = null) {
    const tx = {
      $executeRaw: jest.fn(),
      patientTrip: {
        findUnique: jest.fn().mockResolvedValue({ trip: { status }, cancelledAt }),
        update: jest.fn().mockResolvedValue({ id: 'participation' }),
      },
    };
    const record = jest.fn();
    const service = new PatientTripsService({ $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } as unknown as PrismaService, { record } as unknown as AuditService);
    return { service, tx, record };
  }
  it('preserves the record and records author, reason and server timestamp', async () => {
    const { service, tx, record } = setup();
    await service.cancel('admin', 'participation', '  Administrative reason  ');
    expect(tx.patientTrip.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'participation' },
      data: { cancelledAt: expect.any(Date), cancelledByUserId: 'admin', cancellationReason: 'Administrative reason' },
    }));
    expect(record).toHaveBeenCalledWith(tx, expect.objectContaining({ action: 'PATIENT_TRIP_CANCELLED', actorUserId: 'admin' }));
    expect(tx.$executeRaw).toHaveBeenCalled();
  });
  it.each(['IN_PROGRESS', 'COMPLETED', 'INTERRUPTED', 'CANCELLED'])('rejects cancellation in %s', async status => {
    const { service, tx, record } = setup(status);
    await expect(service.cancel('admin', 'participation', 'Reason')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.patientTrip.update).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });
  it('rejects a second cancellation', async () => {
    const { service, tx } = setup('SCHEDULED', new Date());
    await expect(service.cancel('admin', 'participation', 'Reason')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.patientTrip.update).not.toHaveBeenCalled();
  });
  it('counts only noncancelled patients and nonremoved companions', async () => {
    const tx = { patientTrip: { count: jest.fn().mockResolvedValue(2) }, tripCompanion: { count: jest.fn().mockResolvedValue(1) } };
    expect(await tripOccupancy(tx as unknown as Prisma.TransactionClient, 'trip')).toBe(3);
    expect(tx.patientTrip.count).toHaveBeenCalledWith({ where: { tripId: 'trip', cancelledAt: null } });
    expect(tx.tripCompanion.count).toHaveBeenCalledWith({ where: { removedAt: null, patientTrip: { tripId: 'trip', cancelledAt: null } } });
  });
});
