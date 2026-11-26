import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, StopDirection, StopType } from '../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { TripStopsService } from './trip-stops.service';
import { TripsService } from './trips.service';
import { DriverTripsService } from '../driver-trips/driver-trips.service';
import { assertRouteComplete } from './route-integrity';

describe('Route approval integrity', () => {
  const stop = {
    id: 'out',
    tripId: 'trip',
    direction: StopDirection.OUTBOUND,
    sequence: 1,
    name: 'Fictional hospital',
    address: 'Fictional address',
    municipality: 'Fictional city',
    stopType: StopType.APPOINTMENT,
    notes: null,
  };
  const dto = { ...stop, patients: [{ patientId: 'patient' }] };
  function setup(status = 'SCHEDULED') {
    const tx = {
      $executeRaw: jest.fn(),
      trip: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'trip',
          status,
          routeApprovedAt: new Date(),
        }),
        update: jest.fn().mockResolvedValue({ id: 'trip' }),
      },
      tripStop: {
        findMany: jest
          .fn()
          .mockImplementation(({ where }: { where: { direction?: string } }) =>
            Promise.resolve(where.direction === 'RETURN' ? [] : [stop]),
          ),
        findFirst: jest
          .fn()
          .mockImplementation(({ where }: { where: { id?: unknown } }) =>
            Promise.resolve(typeof where.id === 'string' ? stop : null),
          ),
        findUnique: jest.fn().mockResolvedValue(stop),
        create: jest.fn().mockResolvedValue({ id: 'back' }),
        update: jest.fn().mockResolvedValue({ id: 'back' }),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      patientTrip: {
        count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as unknown as PrismaService;
    const record = jest.fn();
    const audit = { record } as unknown as AuditService;
    return {
      tx,
      prisma,
      record,
      service: new TripStopsService(prisma, audit),
      trips: new TripsService(prisma, audit),
    };
  }

  it.each(['create', 'update', 'remove', 'reorder', 'rebuild'] as const)(
    '%s invalidates both approval fields in the mutation transaction',
    async (action) => {
      const { tx, service, record } = setup();
      if (action === 'create') await service.create('admin', 'trip', dto);
      if (action === 'update')
        await service.update('admin', 'trip', 'out', dto);
      if (action === 'remove') await service.remove('admin', 'trip', 'out');
      if (action === 'reorder')
        await service.reorder('admin', 'trip', 'OUTBOUND', ['out']);
      if (action === 'rebuild') await service.rebuildReturn('admin', 'trip');
      expect(tx.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip' },
        data: { routeApprovedAt: null, routeApprovedByUserId: null },
      });
      expect(tx.$executeRaw).toHaveBeenCalled();
      expect(record).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({ actorUserId: 'admin' }),
      );
    },
  );

  it.each(['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'INTERRUPTED'])(
    'rejects all route mutations and approval in %s',
    async (status) => {
      const { tx, service, trips } = setup(status);
      for (const operation of [
        () => service.create('admin', 'trip', dto),
        () => service.update('admin', 'trip', 'out', dto),
        () => service.remove('admin', 'trip', 'out'),
        () => service.reorder('admin', 'trip', 'OUTBOUND', ['out']),
        () => service.rebuildReturn('admin', 'trip'),
        () => trips.approveRoute('admin', 'trip'),
      ])
        await expect(operation()).rejects.toBeInstanceOf(ConflictException);
      expect(tx.tripStop.update).not.toHaveBeenCalled();
      expect(tx.trip.update).not.toHaveBeenCalled();
    },
  );

  it('rejects patients outside the active participation list', async () => {
    const { tx, service } = setup();
    tx.patientTrip.count.mockResolvedValue(0);
    await expect(service.create('admin', 'trip', dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.tripStop.create).not.toHaveBeenCalled();
  });

  it('rejects partial or repeated sequence lists', async () => {
    const { service } = setup();
    await expect(
      service.reorder('admin', 'trip', 'OUTBOUND', []),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.reorder('admin', 'trip', 'OUTBOUND', ['out', 'out']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('swaps stops without violating positive unique sequences and mirrors the return', async () => {
    const { tx, service } = setup();
    const outbound = [
      { ...stop },
      {
        ...stop,
        id: 'out2',
        sequence: 2,
        name: 'Second hospital',
        address: 'Second address',
      },
    ];
    const returning = [
      { ...stop, id: 'back1', direction: StopDirection.RETURN },
      { ...stop, id: 'back2', direction: StopDirection.RETURN, sequence: 2 },
    ];
    const all = [...outbound, ...returning];
    tx.tripStop.findMany.mockImplementation(
      ({ where }: { where: { direction?: string } }) =>
        Promise.resolve(
          all
            .filter((s) => s.direction === where.direction)
            .map((s) => ({ ...s })),
        ),
    );
    tx.tripStop.update.mockImplementation(
      ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<typeof stop>;
      }) => {
        const current = all.find((s) => s.id === where.id)!;
        if (data.sequence !== undefined) {
          expect(data.sequence).toBeGreaterThan(0);
          expect(
            all.some(
              (s) =>
                s.id !== current.id &&
                s.direction === current.direction &&
                s.sequence === data.sequence,
            ),
          ).toBe(false);
        }
        Object.assign(current, data);
        return Promise.resolve(current);
      },
    );
    await service.reorder('admin', 'trip', 'OUTBOUND', ['out2', 'out']);
    expect(outbound.map((s) => s.sequence)).toEqual([2, 1]);
    expect(returning.map((s) => s.address)).toEqual([
      'Second address',
      stop.address,
    ]);
    expect(tx.patientTrip.updateMany).toHaveBeenCalledWith({
      where: { tripId: 'trip', cancelledAt: null, outboundStopId: 'out2' },
      data: { returnStopId: 'back1' },
    });
    expect(tx.patientTrip.updateMany).toHaveBeenCalledWith({
      where: { tripId: 'trip', cancelledAt: null, outboundStopId: 'out' },
      data: { returnStopId: 'back2' },
    });
  });

  it('approves only matching inverse routes with all active participants linked', async () => {
    const { tx, trips } = setup();
    const back = { ...stop, id: 'back', direction: StopDirection.RETURN };
    tx.tripStop.findMany.mockResolvedValue([stop, back]);
    tx.patientTrip.findMany.mockResolvedValue([
      { outboundStopId: 'out', returnStopId: 'back' },
    ] as never);
    await trips.approveRoute('admin', 'trip');
    expect(tx.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          routeApprovedAt: expect.any(Date),
          routeApprovedByUserId: 'admin',
        },
      }),
    );
    tx.tripStop.findMany.mockResolvedValue([
      stop,
      { ...back, address: 'Other address' },
    ]);
    await expect(
      assertRouteComplete(tx as unknown as Prisma.TransactionClient, 'trip'),
    ).rejects.toBeInstanceOf(BadRequestException);
    tx.tripStop.findMany.mockResolvedValue([stop, back]);
    tx.patientTrip.findMany.mockResolvedValue([
      { outboundStopId: null, returnStopId: 'back' },
    ] as never);
    await expect(
      assertRouteComplete(tx as unknown as Prisma.TransactionClient, 'trip'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hides invalidated sequence and links from the driver and orders approved return inversely', async () => {
    const { prisma, tx } = setup();
    const detail = {
      routeApprovedAt: null as Date | null,
      patientTrips: [{ outboundStopId: 'out', returnStopId: 'back' }],
      stops: [
        { direction: 'RETURN', sequence: 1 },
        { direction: 'OUTBOUND', sequence: 2 },
        { direction: 'RETURN', sequence: 2 },
        { direction: 'OUTBOUND', sequence: 1 },
      ],
    };
    Object.assign(tx.trip, { findFirst: jest.fn().mockResolvedValue(detail) });
    const driver = new DriverTripsService(prisma, {} as TripsService, {} as import('./patient-trips.service').PatientTripsService);
    const hidden = await driver.get('driver', 'trip');
    expect(hidden.stops).toEqual([]);
    expect(hidden.patientTrips[0].outboundStopId).toBeNull();
    detail.routeApprovedAt = new Date();
    const approved = await driver.get('driver', 'trip');
    expect(approved.stops.map((s) => [s.direction, s.sequence])).toEqual([
      ['OUTBOUND', 1],
      ['OUTBOUND', 2],
      ['RETURN', 2],
      ['RETURN', 1],
    ]);
  });
});
