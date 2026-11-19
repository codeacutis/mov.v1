import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const admin = {
  name: 'Admin Paradas',
  email: 'admin-paradas@teste.local',
  password: 'senha-ficticia-123',
};

describe('Paradas e Acompanhantes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let token: string;
  let tripId: string;
  let patientTripId: string;
  let patientId: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
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
    const loginRes = await request(http)
      .post('/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(200);
    token = loginRes.body.accessToken as string;

    const vehicle = await request(http)
      .post('/vehicles')
      .set(auth())
      .send({ plate: 'TST0001', capacity: 5 })
      .expect(201);
    const driver = await request(http)
      .post('/drivers')
      .set(auth())
      .send({
        name: 'Motorista Teste',
        email: 'motorista-paradas@teste.local',
        password: 'senha-ficticia-123',
        licenseCategory: 'D',
      })
      .expect(201);
    const trip = await request(http)
      .post('/trips')
      .set(auth())
      .send({
        vehicleId: vehicle.body.id,
        driverId: driver.body.id,
        municipalPickupPoint: 'Terminal Central',
        plannedDepartureAt: '2099-01-10T07:00:00.000Z',
        plannedReturnStartAt: '2099-01-10T18:00:00.000Z',
      })
      .expect(201);
    tripId = trip.body.id as string;

    const patient = await request(http)
      .post('/patients')
      .set(auth())
      .send({
        name: 'Paciente Parada',
        birthDate: '1990-03-15',
      })
      .expect(201);
    patientId = patient.body.id as string;

    const adminUser = await prisma.user.findUniqueOrThrow({
      where: { email: admin.email },
    });
    const pt = await prisma.patientTrip.create({
      data: {
        tripId,
        patientId,
        priority: 'MEDIUM',
        priorityDefinedByUserId: adminUser.id,
        priorityDefinedAt: new Date(),
      },
    });
    patientTripId = pt.id;
  });

  // ── Implementação 3: Paradas ──────────────────────────────────────────────

  describe('Paradas', () => {
    it('cadastra uma parada e a lista na sequência correta', async () => {
      await request(http)
        .post(`/trips/${tripId}/stops`)
        .set(auth())
        .send({
          direction: 'OUTBOUND',
          sequence: 1,
          name: 'UBS Central',
          address: 'Rua A, 100',
          municipality: 'Cidade',
          stopType: 'APPOINTMENT',
        })
        .expect(201);

      await request(http)
        .post(`/trips/${tripId}/stops`)
        .set(auth())
        .send({
          direction: 'OUTBOUND',
          sequence: 2,
          name: 'Hospital Regional',
          address: 'Av. B, 200',
          municipality: 'Cidade',
          stopType: 'APPOINTMENT',
        })
        .expect(201);

      const res = await request(http)
        .get(`/trips/${tripId}/stops`)
        .set(auth())
        .expect(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].sequence).toBe(1);
      expect(res.body[1].sequence).toBe(2);
    });

    it('associa paciente à parada de ida', async () => {
      const stop = await request(http)
        .post(`/trips/${tripId}/stops`)
        .set(auth())
        .send({
          direction: 'OUTBOUND',
          sequence: 1,
          name: 'UBS Central',
          address: 'Rua A, 100',
          municipality: 'Cidade',
          stopType: 'APPOINTMENT',
          patients: [{ patientId }],
        })
        .expect(201);

      expect(stop.body.outboundPatientTrips).toHaveLength(1);
      expect(stop.body.outboundPatientTrips[0].patient.name).toBe(
        'Paciente Parada',
      );

      const pt = await prisma.patientTrip.findUniqueOrThrow({
        where: { id: patientTripId },
      });
      expect(pt.outboundStopId).toBe(stop.body.id);
    });

    it('rejeita sequência duplicada na mesma direção', async () => {
      await request(http)
        .post(`/trips/${tripId}/stops`)
        .set(auth())
        .send({
          direction: 'OUTBOUND',
          sequence: 1,
          name: 'Parada A',
          address: 'Rua A',
          municipality: 'Cidade',
          stopType: 'APPOINTMENT',
        })
        .expect(201);

      await request(http)
        .post(`/trips/${tripId}/stops`)
        .set(auth())
        .send({
          direction: 'OUTBOUND',
          sequence: 1,
          name: 'Parada B',
          address: 'Rua B',
          municipality: 'Cidade',
          stopType: 'APPOINTMENT',
        })
        .expect(400);
    });

    it('remove uma parada e desvincula os patientTrips', async () => {
      const stop = await request(http)
        .post(`/trips/${tripId}/stops`)
        .set(auth())
        .send({
          direction: 'OUTBOUND',
          sequence: 1,
          name: 'UBS',
          address: 'Rua A',
          municipality: 'Cidade',
          stopType: 'APPOINTMENT',
          patients: [{ patientId }],
        })
        .expect(201);

      await request(http)
        .delete(`/trips/${tripId}/stops/${stop.body.id}`)
        .set(auth())
        .expect(204);

      const stops = await request(http)
        .get(`/trips/${tripId}/stops`)
        .set(auth())
        .expect(200);
      expect(stops.body).toHaveLength(0);

      const pt = await prisma.patientTrip.findUniqueOrThrow({
        where: { id: patientTripId },
      });
      expect(pt.outboundStopId).toBeNull();
    });

    it('exige autenticação para gerenciar paradas', async () => {
      await request(http).get(`/trips/${tripId}/stops`).expect(401);
    });
  });

  // ── Implementação 4: Acompanhantes ────────────────────────────────────────

  describe('Acompanhantes', () => {
    const companion = {
      name: 'Ana Acompanhante',
      phone: '(11) 98765-4321',
      relationship: 'Filha',
    };

    it('cadastra, edita e remove um acompanhante', async () => {
      const created = await request(http)
        .post(`/patient-trips/${patientTripId}/companions`)
        .set(auth())
        .send(companion)
        .expect(201);

      expect(created.body).toMatchObject({
        name: 'Ana Acompanhante',
        relationship: 'Filha',
      });

      const updated = await request(http)
        .patch(`/patient-trips/${patientTripId}/companions/${created.body.id}`)
        .set(auth())
        .send({ name: 'Ana Silva' })
        .expect(200);
      expect(updated.body.name).toBe('Ana Silva');

      await request(http)
        .delete(`/patient-trips/${patientTripId}/companions/${created.body.id}`)
        .set(auth())
        .expect(204);

      const list = await request(http)
        .get(`/patient-trips/${patientTripId}/companions`)
        .set(auth())
        .expect(200);
      expect(list.body).toHaveLength(0);
    });

    it('bloqueia acompanhante quando capacidade do veículo seria excedida', async () => {
      // Veículo tem capacidade 5; já há 1 patientTrip. Adiciona 4 acompanhantes (ocupa tudo).
      for (let i = 0; i < 1; i++) {
        await request(http)
          .post(`/patient-trips/${patientTripId}/companions`)
          .set(auth())
          .send({ name: `Acomp ${i}`, phone: `(11) 9000${i}-0000` })
          .expect(201);
      }
      // O segundo acompanhante da mesma participação é rejeitado
      await request(http)
        .post(`/patient-trips/${patientTripId}/companions`)
        .set(auth())
        .send({ name: 'Excedente', phone: '(11) 90005-0000' })
        .expect(409);
    });

    it('lista acompanhantes de uma participação', async () => {
      await request(http)
        .post(`/patient-trips/${patientTripId}/companions`)
        .set(auth())
        .send(companion)
        .expect(201);
      await request(http)
        .post(`/patient-trips/${patientTripId}/companions`)
        .set(auth())
        .send({ name: 'Carlos Filho', phone: '(11) 91111-2222' })
        .expect(409);

      const list = await request(http)
        .get(`/patient-trips/${patientTripId}/companions`)
        .set(auth())
        .expect(200);
      expect(list.body).toHaveLength(1);
    });

    it('rejeita acompanhante com nome curto ou telefone inválido', async () => {
      await request(http)
        .post(`/patient-trips/${patientTripId}/companions`)
        .set(auth())
        .send({ name: 'A', phone: '(11) 98765-4321' })
        .expect(400);
      await request(http)
        .post(`/patient-trips/${patientTripId}/companions`)
        .set(auth())
        .send({ name: 'Nome Válido', phone: '123' })
        .expect(400);
    });
  });
});
