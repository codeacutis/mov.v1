import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const admin = {
  name: 'Admin Regras',
  email: 'admin-regras@teste.local',
  password: 'senha-ficticia-123',
};

const driverAccount = {
  name: 'Motorista Regras',
  email: 'motorista-regras@teste.local',
  password: 'senha-ficticia-123',
  licenseCategory: 'D',
};

describe('Validação das regras principais (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let adminToken: string;
  let driverToken: string;
  let adminUserId: string;
  let vehicleId: string;
  let driverId: string;

  const adminAuth = () => ({ Authorization: `Bearer ${adminToken}` });
  const driverAuth = () => ({ Authorization: `Bearer ${driverToken}` });
  const tripPayload = () => ({
    vehicleId,
    driverId,
    municipalPickupPoint: 'Terminal Municipal',
    plannedDepartureAt: '2099-08-10T06:00:00.000Z',
    plannedReturnStartAt: '2099-08-10T18:00:00.000Z',
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    http = app.getHttpServer();
    prisma = app.get(PrismaService);
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "audit_logs","sessions","confirmation_logs","trip_companions","patient_trips","trip_stops","trips","vehicles","drivers","patients","users" CASCADE',
    );

    await request(http).post('/auth/bootstrap').send(admin).expect(201);
    const adminLogin = await request(http)
      .post('/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(200);
    adminToken = adminLogin.body.accessToken as string;
    adminUserId = (
      await prisma.user.findUniqueOrThrow({ where: { email: admin.email } })
    ).id;

    const vehicle = await request(http)
      .post('/vehicles')
      .set(adminAuth())
      .send({ plate: 'RGR0001', capacity: 3 })
      .expect(201);
    vehicleId = vehicle.body.id as string;

    const driver = await request(http)
      .post('/drivers')
      .set(adminAuth())
      .send(driverAccount)
      .expect(201);
    driverId = driver.body.id as string;

    const driverLogin = await request(http)
      .post('/auth/login')
      .send({ email: driverAccount.email, password: driverAccount.password })
      .expect(200);
    driverToken = driverLogin.body.accessToken as string;
  });

  describe('Conflitos de horários', () => {
    it('bloqueia sobreposição parcial do mesmo veículo', async () => {
      await request(http)
        .post('/trips')
        .set(adminAuth())
        .send(tripPayload())
        .expect(201);

      const secondDriver = await request(http)
        .post('/drivers')
        .set(adminAuth())
        .send({
          ...driverAccount,
          name: 'Segundo Motorista',
          email: 'segundo-motorista@teste.local',
        })
        .expect(201);

      await request(http)
        .post('/trips')
        .set(adminAuth())
        .send({
          ...tripPayload(),
          driverId: secondDriver.body.id,
          plannedDepartureAt: '2099-08-10T12:00:00.000Z',
          plannedReturnStartAt: '2099-08-10T20:00:00.000Z',
        })
        .expect(409);
    });

    it('permite reutilizar veículo e motorista após cancelamento', async () => {
      const first = await request(http)
        .post('/trips')
        .set(adminAuth())
        .send(tripPayload())
        .expect(201);
      await request(http)
        .patch(`/trips/${first.body.id}/cancel`)
        .set(adminAuth())
        .send({ reason: 'Reprogramação operacional' })
        .expect(200);

      await request(http)
        .post('/trips')
        .set(adminAuth())
        .send(tripPayload())
        .expect(201);
    });

    it('protege contra duas criações concorrentes com os mesmos recursos', async () => {
      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          request(http).post('/trips').set(adminAuth()).send(tripPayload()),
        ),
      );

      expect(
        responses.filter((response) => response.status === 201),
      ).toHaveLength(1);
      expect(
        responses.filter((response) => response.status === 409),
      ).toHaveLength(9);
      expect(await prisma.trip.count()).toBe(1);
    });
  });

  describe('Capacidade do veículo', () => {
    it('aceita ocupação exatamente no limite e rejeita um ocupante excedente', async () => {
      const trip = await request(http)
        .post('/trips')
        .set(adminAuth())
        .send(tripPayload())
        .expect(201);
      const patients = await Promise.all(
        ['Paciente Um', 'Paciente Dois'].map((name) =>
          prisma.patient.create({
            data: { name, birthDate: new Date('1990-01-01') },
          }),
        ),
      );
      const patientTrips = await Promise.all(
        patients.map((patient) =>
          prisma.patientTrip.create({
            data: {
              tripId: trip.body.id as string,
              patientId: patient.id,
              priority: 'MEDIUM',
              priorityDefinedByUserId: adminUserId,
              priorityDefinedAt: new Date(),
            },
          }),
        ),
      );

      await request(http)
        .post(`/patient-trips/${patientTrips[0].id}/companions`)
        .set(adminAuth())
        .send({ name: 'Acompanhante Um', phone: '(35) 99999-0001' })
        .expect(201);

      await request(http)
        .post(`/patient-trips/${patientTrips[1].id}/companions`)
        .set(adminAuth())
        .send({ name: 'Acompanhante Excedente', phone: '(35) 99999-0002' })
        .expect(409);

      expect(await prisma.tripCompanion.count()).toBe(1);
    });

    it('protege a capacidade contra inclusões concorrentes de acompanhantes', async () => {
      const trip = await request(http)
        .post('/trips')
        .set(adminAuth())
        .send(tripPayload())
        .expect(201);
      const patients = await Promise.all(
        ['Paciente Concorrente Um', 'Paciente Concorrente Dois'].map((name) =>
          prisma.patient.create({
            data: { name, birthDate: new Date('1990-01-01') },
          }),
        ),
      );
      const patientTrips = await Promise.all(
        patients.map((patient) =>
          prisma.patientTrip.create({
            data: {
              tripId: trip.body.id as string,
              patientId: patient.id,
              priority: 'MEDIUM',
              priorityDefinedByUserId: adminUserId,
              priorityDefinedAt: new Date(),
            },
          }),
        ),
      );

      const responses = await Promise.all(
        Array.from({ length: 5 }, (_, index) =>
          request(http)
            .post(`/patient-trips/${patientTrips[0].id}/companions`)
            .set(adminAuth())
            .send({
              name: `Acompanhante Concorrente ${index}`,
              phone: `(35) 99990-000${index}`,
            }),
        ),
      );

      expect(
        responses.filter((response) => response.status === 201),
      ).toHaveLength(1);
      expect(
        responses.filter((response) => response.status === 409),
      ).toHaveLength(4);
      expect(await prisma.tripCompanion.count()).toBe(1);
    });
  });

  describe('Cancelamento e interrupção', () => {
    it('preserva estados, motivos, providência e auditoria', async () => {
      const cancelled = await request(http)
        .post('/trips')
        .set(adminAuth())
        .send(tripPayload())
        .expect(201);
      await request(http)
        .patch(`/trips/${cancelled.body.id}/cancel`)
        .set(adminAuth())
        .send({ reason: 'Veículo indisponível' })
        .expect(200);

      const interrupted = await request(http)
        .post('/trips')
        .set(adminAuth())
        .send({
          ...tripPayload(),
          plannedDepartureAt: '2099-08-11T06:00:00.000Z',
          plannedReturnStartAt: '2099-08-11T18:00:00.000Z',
        })
        .expect(201);
      await request(http)
        .patch(`/trips/${interrupted.body.id}/start`)
        .set(adminAuth())
        .expect(200);
      await request(http)
        .patch(`/trips/${interrupted.body.id}/interrupt`)
        .set(adminAuth())
        .send({
          reason: 'Falha mecânica',
          action: 'Transporte substituto acionado',
        })
        .expect(200);

      const records = await prisma.trip.findMany({
        orderBy: { plannedDepartureAt: 'asc' },
      });
      expect(records[0]).toMatchObject({
        status: 'CANCELLED',
        cancellationReason: 'Veículo indisponível',
        cancelledByUserId: adminUserId,
      });
      expect(records[1]).toMatchObject({
        status: 'INTERRUPTED',
        interruptionReason: 'Falha mecânica',
        interruptionAction: 'Transporte substituto acionado',
        interruptedByUserId: adminUserId,
      });

      const actions = await prisma.auditLog.findMany({
        where: {
          action: { in: ['TRIP_CANCELLED', 'TRIP_INTERRUPTED'] },
        },
        select: { action: true },
      });
      expect(actions.map(({ action }) => action).sort()).toEqual([
        'TRIP_CANCELLED',
        'TRIP_INTERRUPTED',
      ]);
    });

    it('rejeita interrupção antes do início', async () => {
      const trip = await request(http)
        .post('/trips')
        .set(adminAuth())
        .send(tripPayload())
        .expect(201);
      await request(http)
        .patch(`/trips/${trip.body.id}/interrupt`)
        .set(adminAuth())
        .send({ reason: 'Teste inválido', action: 'Nenhuma' })
        .expect(409);
    });
  });

  describe('Retorno individual', () => {
    it('mantém ida e retorno independentes para cada paciente', async () => {
      const trip = await request(http)
        .post('/trips')
        .set(adminAuth())
        .send(tripPayload())
        .expect(201);
      const firstPatient = await prisma.patient.create({
        data: {
          name: 'Paciente Sem Retorno',
          birthDate: new Date('1980-05-10'),
        },
      });
      const secondPatient = await prisma.patient.create({
        data: {
          name: 'Paciente Com Retorno',
          birthDate: new Date('1985-07-12'),
        },
      });
      const firstParticipation = await prisma.patientTrip.create({
        data: {
          tripId: trip.body.id as string,
          patientId: firstPatient.id,
          priority: 'MEDIUM',
          priorityDefinedByUserId: adminUserId,
          priorityDefinedAt: new Date(),
          outboundStatus: 'BOARDED',
          returnStatus: 'NOT_RETURNING',
          returnAbsenceReason: 'Retorno por meio próprio',
          returnAbsenceReportedAt: new Date(),
          returnAbsenceReportedByUserId: adminUserId,
        },
      });
      const secondParticipation = await prisma.patientTrip.create({
        data: {
          tripId: trip.body.id as string,
          patientId: secondPatient.id,
          priority: 'MEDIUM',
          priorityDefinedByUserId: adminUserId,
          priorityDefinedAt: new Date(),
          outboundStatus: 'BOARDED',
          returnStatus: 'EXPECTED',
        },
      });

      const detail = await request(http)
        .get(`/driver/trips/${trip.body.id}`)
        .set(driverAuth())
        .expect(200);
      const byId = new Map(
        detail.body.patientTrips.map(
          (participation: {
            id: string;
            outboundStatus: string;
            returnStatus: string;
          }) => [participation.id, participation],
        ),
      );

      expect(byId.get(firstParticipation.id)).toMatchObject({
        outboundStatus: 'BOARDED',
        returnStatus: 'NOT_RETURNING',
      });
      expect(byId.get(secondParticipation.id)).toMatchObject({
        outboundStatus: 'BOARDED',
        returnStatus: 'EXPECTED',
      });
      expect(await prisma.patientTrip.count()).toBe(2);
    });
  });
});
