import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/audit/audit.service';

describe('Driver operations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let driverToken: string,
    otherToken: string,
    adminToken: string,
    driverUserId: string,
    tripId: string,
    participantId: string;
  const auth = (token = driverToken) => ({ Authorization: `Bearer ${token}` });
  const path = (suffix: string) => `/driver/trips/${tripId}/${suffix}`;
  const statusPath = (direction: 'outbound' | 'return') =>
    path(`participants/${participantId}/${direction}-status`);
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    http = app.getHttpServer();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "audit_logs","sessions","confirmation_logs","trip_companions","patient_trips","trip_stops","trips","vehicles","drivers","patients","users" CASCADE',
    );
    const tokenFor = async (userId: string) => {
      const session = await prisma.session.create({
        data: { userId, expiresAt: new Date(Date.now() + 3600000) },
      });
      return app.get(JwtService).signAsync({ sub: userId, sid: session.id });
    };
    const admin = await prisma.user.create({
      data: {
        name: 'Fictional admin',
        email: 'admin@driver-test.local',
        role: 'ADMIN',
        passwordHash: 'fictional-unusable',
      },
    });
    adminToken = await tokenFor(admin.id);
    const driver = await prisma.driver.create({
      data: {
        user: {
          create: {
            name: 'Fictional driver',
            email: 'driver@driver-test.local',
            role: 'MOTORISTA',
            passwordHash: 'fictional-unusable',
          },
        },
      },
    });
    driverUserId = driver.userId;
    driverToken = await tokenFor(driver.userId);
    const other = await prisma.driver.create({
      data: {
        user: {
          create: {
            name: 'Other fictional driver',
            email: 'other@driver-test.local',
            role: 'MOTORISTA',
            passwordHash: 'fictional-unusable',
          },
        },
      },
    });
    otherToken = await tokenFor(other.userId);
    const vehicle = await prisma.vehicle.create({
      data: { plate: 'DRV0001', capacity: 4 },
    });
    const trip = await prisma.trip.create({
      data: {
        driverId: driver.id,
        vehicleId: vehicle.id,
        municipalPickupPoint: 'Fictional terminal',
        plannedDepartureAt: new Date('2099-01-01T06:00:00Z'),
        plannedReturnStartAt: new Date('2099-01-01T18:00:00Z'),
        routeApprovedAt: new Date(),
        routeApprovedByUserId: admin.id,
      },
    });
    tripId = trip.id;
    const patient = await prisma.patient.create({
      data: {
        name: 'Fictional passenger',
        birthDate: new Date('1990-01-01'),
        susCardNumber: 'PRIVATE-SUS',
        address: 'PRIVATE-HOME',
        operationalNotes: 'PRIVATE-NOTE',
      },
    });
    participantId = (
      await prisma.patientTrip.create({
        data: {
          tripId,
          patientId: patient.id,
          priority: 'HIGH',
          priorityJustification: 'PRIVATE-PRIORITY',
          priorityDefinedByUserId: admin.id,
          priorityDefinedAt: new Date(),
        },
      })
    ).id;
  });

  it('executes departure, outbound, return and completion with server times and audit', async () => {
    await request(http).patch(path('complete')).set(auth()).expect(409);
    const before = Date.now();
    await request(http).patch(path('start')).set(auth()).expect(204);
    await request(http).patch(path('start')).set(auth()).expect(409);
    await request(http)
      .patch(statusPath('outbound'))
      .set(auth())
      .send({ status: 'BOARDED' })
      .expect(204);
    await request(http)
      .patch(statusPath('return'))
      .set(auth())
      .send({ status: 'RETURNED' })
      .expect(409);
    await request(http).patch(path('start-return')).set(auth()).expect(204);
    await request(http).patch(path('start-return')).set(auth()).expect(409);
    await request(http)
      .patch(statusPath('outbound'))
      .set(auth())
      .send({ status: 'NO_SHOW' })
      .expect(409);
    await request(http)
      .patch(statusPath('return'))
      .set(auth())
      .send({ status: 'RETURNED' })
      .expect(204);
    await request(http).patch(path('complete')).set(auth()).expect(204);
    await request(http)
      .patch(statusPath('return'))
      .set(auth())
      .send({ status: 'NOT_RETURNING', reason: 'Fictional notice' })
      .expect(409);
    const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
    expect(trip.status).toBe('COMPLETED');
    for (const time of [
      trip.actualDepartureAt,
      trip.actualReturnStartAt,
      trip.actualReturnAt,
    ]) {
      expect(time?.getTime()).toBeGreaterThanOrEqual(before);
      expect(time?.getTime()).toBeLessThanOrEqual(Date.now());
    }
    const patient = await prisma.patientTrip.findUniqueOrThrow({
      where: { id: participantId },
    });
    expect(patient.outboundStatus).toBe('BOARDED');
    expect(patient.returnStatus).toBe('RETURNED');
    const actions = (
      await prisma.auditLog.findMany({ where: { actorUserId: driverUserId } })
    ).map((a) => a.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'TRIP_STARTED',
        'TRIP_RETURN_STARTED',
        'TRIP_COMPLETED',
        'PATIENT_TRIP_OUTBOUND_STATUS_CHANGED',
        'PATIENT_TRIP_RETURN_STATUS_CHANGED',
      ]),
    );
  });

  it('preserves outbound when the patient reports not returning', async () => {
    await request(http).patch(path('start')).set(auth()).expect(204);
    await request(http)
      .patch(statusPath('outbound'))
      .set(auth())
      .send({ status: 'BOARDED' })
      .expect(204);
    await request(http)
      .patch(statusPath('return'))
      .set(auth())
      .send({
        status: 'NOT_RETURNING',
        reason: 'Returning with family (fictional)',
      })
      .expect(204);
    const pt = await prisma.patientTrip.findUniqueOrThrow({
      where: { id: participantId },
    });
    expect(pt.outboundStatus).toBe('BOARDED');
    expect(pt.returnStatus).toBe('NOT_RETURNING');
    expect(pt.returnAbsenceReportedByUserId).toBe(driverUserId);
    expect(pt.returnAbsenceReportedAt).toBeTruthy();
  });

  it('requires contact attempt plus reason for return absence, retaining both observations atomically', async () => {
    await request(http).patch(path('start')).set(auth()).expect(204);
    await request(http).patch(path('start-return')).set(auth()).expect(204);
    await request(http)
      .patch(statusPath('return'))
      .set(auth())
      .send({ status: 'RETURNED' })
      .expect(409);
    await request(http)
      .patch(statusPath('return'))
      .set(auth())
      .send({ status: 'NO_SHOW', reason: 'Fictional absence' })
      .expect(400);
    expect(await prisma.tripObservation.count()).toBe(0);
    await request(http)
      .patch(statusPath('return'))
      .set(auth())
      .send({
        status: 'NO_SHOW',
        reason: 'Fictional absence',
        contactAttempt: 'Called companion; no answer (fictional)',
      })
      .expect(204);
    const observations = await prisma.tripObservation.findMany({
      where: { tripId, patientTripId: participantId },
    });
    expect(observations.map((o) => o.type).sort()).toEqual([
      'CONTACT_ATTEMPT',
      'INCIDENT',
    ]);
    expect(
      observations.every((o) => o.authorId === driverUserId && !!o.createdAt),
    ).toBe(true);
    expect(
      (
        await prisma.patientTrip.findUniqueOrThrow({
          where: { id: participantId },
        })
      ).outboundStatus,
    ).toBe('PLANNED');
  });

  it('rejects every operation by another driver, ADMIN or anonymous actor', async () => {
    const operations = [
      () => request(http).patch(path('start')),
      () => request(http).patch(path('start-return')),
      () => request(http).patch(path('complete')),
      () =>
        request(http).patch(statusPath('outbound')).send({ status: 'BOARDED' }),
      () =>
        request(http)
          .patch(statusPath('return'))
          .send({ status: 'NOT_RETURNING', reason: 'Fictional notice' }),
      () =>
        request(http)
          .post(path('observations'))
          .send({ type: 'INCIDENT', description: 'Fictional occurrence' }),
    ];
    for (const operation of operations) {
      await operation().set(auth(otherToken)).expect(404);
      await operation().set(auth(adminToken)).expect(403);
      await operation().expect(401);
    }
    expect(
      await prisma.auditLog.count({
        where: { actorUserId: { not: driverUserId } },
      }),
    ).toBe(0);
  });

  it('rejects participants of another trip even when the driver owns both trips', async () => {
    const original = await prisma.trip.findUniqueOrThrow({
      where: { id: tripId },
    });
    const other = await prisma.trip.create({
      data: {
        driverId: original.driverId,
        vehicleId: original.vehicleId,
        municipalPickupPoint: 'Other fictional terminal',
        plannedDepartureAt: new Date('2099-01-02T06:00:00Z'),
        plannedReturnStartAt: new Date('2099-01-02T18:00:00Z'),
        status: 'IN_PROGRESS',
      },
    });
    await request(http)
      .patch(
        `/driver/trips/${other.id}/participants/${participantId}/outbound-status`,
      )
      .set(auth())
      .send({ status: 'BOARDED' })
      .expect(404);
    await request(http)
      .post(`/driver/trips/${other.id}/observations`)
      .set(auth())
      .send({
        type: 'CONTACT_ATTEMPT',
        patientTripId: participantId,
        description: 'Fictional attempt',
      })
      .expect(404);
  });

  it('records standalone occurrences and contact attempts without returning free text', async () => {
    await request(http).patch(path('start')).set(auth()).expect(204);
    await request(http)
      .post(path('observations'))
      .set(auth())
      .send({ type: 'CONTACT_ATTEMPT', description: 'Fictional attempt' })
      .expect(400);
    await request(http)
      .post(path('observations'))
      .set(auth())
      .send({
        type: 'CONTACT_ATTEMPT',
        patientTripId: participantId,
        description: 'Fictional attempt',
      })
      .expect(204);
    await request(http)
      .post(path('observations'))
      .set(auth())
      .send({ type: 'INCIDENT', description: 'Fictional incident' })
      .expect(204);
    const detail = await request(http)
      .get(`/driver/trips/${tripId}`)
      .set(auth())
      .expect(200);
    const json = JSON.stringify(detail.body);
    for (const forbidden of [
      'cpf',
      'PRIVATE-',
      'susCardNumber',
      'birthDate',
      'notes',
      'priority',
      'observations',
      'description":"Fictional',
    ])
      expect(json).not.toContain(forbidden);
  });

  it('rolls back a transition if its audit cannot be persisted', async () => {
    const audit = app.get(AuditService);
    const failure = jest
      .spyOn(audit, 'record')
      .mockRejectedValueOnce(new Error('Fictional audit failure'));
    try {
      await request(http).patch(path('start')).set(auth()).expect(500);
    } finally {
      failure.mockRestore();
    }
    const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
    expect(trip.status).toBe('SCHEDULED');
    expect(trip.actualDepartureAt).toBeNull();
  });

  it('rejects unapproved routes, inactive drivers and cancelled participants', async () => {
    await prisma.trip.update({
      where: { id: tripId },
      data: { routeApprovedAt: null },
    });
    await request(http).patch(path('start')).set(auth()).expect(409);
    await prisma.trip.update({
      where: { id: tripId },
      data: { routeApprovedAt: new Date(), status: 'IN_PROGRESS' },
    });
    await prisma.patientTrip.update({
      where: { id: participantId },
      data: { cancelledAt: new Date() },
    });
    await request(http)
      .patch(statusPath('outbound'))
      .set(auth())
      .send({ status: 'BOARDED' })
      .expect(409);
    await prisma.driver.update({
      where: { userId: driverUserId },
      data: { isActive: false },
    });
    await request(http).patch(path('start-return')).set(auth()).expect(404);
    const list = await request(http)
      .get('/driver/trips')
      .set(auth())
      .expect(200);
    expect(list.body).toEqual([]);
  });
});
