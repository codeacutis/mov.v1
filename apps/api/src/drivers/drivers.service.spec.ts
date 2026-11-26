import { DriversService } from './drivers.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('DriversService', () => {
  const driver = { id: 'driver', userId: 'user', isActive: false };
  function setup() {
    const tx = { $executeRaw: jest.fn(), driver: { findUnique: jest.fn().mockResolvedValue(driver), update: jest.fn() }, user: { update: jest.fn() } };
    const record = jest.fn();
    const service = new DriversService({ $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) } as unknown as PrismaService, { record } as unknown as AuditService);
    return { service, tx, record };
  }
  it('persists license and operational fields on edit', async () => {
    const { service, tx, record } = setup();
    await service.update('actor', 'driver', { licenseNumber: '123', licenseCategory: 'D', licenseExpiresAt: '2030-01-01', hasPassengerTransportCourse: true, notes: '' });
    expect(tx.driver.update).toHaveBeenCalledWith({ where: { id: 'driver' }, data: { licenseNumber: '123', licenseCategory: 'D', licenseExpiresAt: new Date('2030-01-01'), hasPassengerTransportCourse: true, notes: null } });
    expect(record).toHaveBeenCalled();
  });
  it('inactivates the account even if the Driver was already inactive', async () => {
    const { service, tx } = setup();
    await service.inactivate('actor', 'driver');
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'user' }, data: { isActive: false } });
  });
});
