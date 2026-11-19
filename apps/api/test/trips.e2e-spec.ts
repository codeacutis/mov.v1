import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const admin = {
  name: 'Admin Viagens',
  email: 'admin-viagens@teste.local',
  password: 'senha-ficticia-123',
};

describe('Viagens (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let token: string;
  let vehicleId: string;
  let driverId: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });

  const tripPayload = () => ({
    vehicleId,
    driverId,
    municipalPickupPoint: 'Terminal Central',
    plannedDepartureAt: '2099-06-10T06:00:00.000Z',
    plannedReturnStartAt: '2099-06-10T18:00:00.000Z',
  });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
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
      .send({ plate: 'VGM0001', capacity: 10 })
      .expect(201);
    vehicleId = vehicle.body.id as string;

    const driver = await request(http)
      .post('/drivers')
      .set(auth())
      .send({
        name: 'Motorista Viagens',
        email: 'motorista-viagens@teste.local',
        password: 'senha-ficticia-123',
        licenseCategory: 'D',
      })
      .expect(201);
    driverId = driver.body.id as string;
  });

  // ── Criação ───────────────────────────────────────────────────────────────

  describe('POST /trips', () => {
    it('cria uma viagem e retorna os dados com veículo e motorista', async () => {
      const res = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      expect(res.body).toMatchObject({
        status: 'SCHEDULED',
        municipalPickupPoint: 'Terminal Central',
        vehicle: { id: vehicleId },
        driver: { id: driverId },
      });
      expect(res.body.id).toBeDefined();
    });

    it('rejeita quando retorno é anterior à saída', async () => {
      await request(http)
        .post('/trips')
        .set(auth())
        .send({
          ...tripPayload(),
          plannedReturnStartAt: '2099-06-10T05:00:00.000Z',
        })
        .expect(400);
    });

    it('rejeita veículo inexistente', async () => {
      await request(http)
        .post('/trips')
        .set(auth())
        .send({ ...tripPayload(), vehicleId: '00000000-0000-7000-8000-000000000000' })
        .expect(404);
    });

    it('rejeita motorista inexistente', async () => {
      await request(http)
        .post('/trips')
        .set(auth())
        .send({ ...tripPayload(), driverId: '00000000-0000-7000-8000-000000000001' })
        .expect(404);
    });

    it('bloqueia conflito de veículo no mesmo período', async () => {
      await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      await request(http).post('/trips').set(auth()).send(tripPayload()).expect(409);
    });

    it('bloqueia conflito de motorista no mesmo período', async () => {
      const v2 = await request(http)
        .post('/vehicles')
        .set(auth())
        .send({ plate: 'VGM0002', capacity: 5 })
        .expect(201);

      await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      await request(http)
        .post('/trips')
        .set(auth())
        .send({ ...tripPayload(), vehicleId: v2.body.id })
        .expect(409);
    });

    it('exige autenticação', async () => {
      await request(http).post('/trips').send(tripPayload()).expect(401);
    });
  });

  // ── Consulta ──────────────────────────────────────────────────────────────

  describe('GET /trips e GET /trips/:id', () => {
    it('lista viagens com paginação', async () => {
      await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      const res = await request(http).get('/trips').set(auth()).expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data).toHaveLength(1);
    });

    it('busca viagem por id', async () => {
      const created = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      const res = await request(http).get(`/trips/${created.body.id}`).set(auth()).expect(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it('retorna 404 para id inexistente', async () => {
      await request(http)
        .get('/trips/00000000-0000-7000-8000-000000000099')
        .set(auth())
        .expect(404);
    });
  });

  // ── Edição de horários planejados ─────────────────────────────────────────

  describe('PATCH /trips/:id', () => {
    it('atualiza horários planejados antes do início', async () => {
      const trip = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      const res = await request(http)
        .patch(`/trips/${trip.body.id}`)
        .set(auth())
        .send({ plannedDepartureAt: '2099-06-10T07:00:00.000Z' })
        .expect(200);
      expect(res.body.plannedDepartureAt).toContain('07:00');
    });

    it('atualiza veículo e motorista antes do início', async () => {
      const v2 = await request(http)
        .post('/vehicles')
        .set(auth())
        .send({ plate: 'VGM0003', capacity: 8 })
        .expect(201);
      const d2 = await request(http)
        .post('/drivers')
        .set(auth())
        .send({
          name: 'Motorista 2',
          email: 'motorista2@teste.local',
          password: 'senha-ficticia-123',
          licenseCategory: 'D',
        })
        .expect(201);

      const trip = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      const res = await request(http)
        .patch(`/trips/${trip.body.id}`)
        .set(auth())
        .send({ vehicleId: v2.body.id, driverId: d2.body.id })
        .expect(200);
      expect(res.body.vehicle.id).toBe(v2.body.id);
      expect(res.body.driver.id).toBe(d2.body.id);
    });

    it('bloqueia edição após início', async () => {
      const trip = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      await request(http).patch(`/trips/${trip.body.id}/start`).set(auth()).expect(200);
      await request(http)
        .patch(`/trips/${trip.body.id}`)
        .set(auth())
        .send({ plannedDepartureAt: '2099-06-10T08:00:00.000Z' })
        .expect(409);
    });

    it('bloqueia conflito de veículo ao reatribuir', async () => {
      const v2 = await request(http)
        .post('/vehicles')
        .set(auth())
        .send({ plate: 'VGM0004', capacity: 5 })
        .expect(201);
      const d2 = await request(http)
        .post('/drivers')
        .set(auth())
        .send({
          name: 'Motorista 3',
          email: 'motorista3@teste.local',
          password: 'senha-ficticia-123',
          licenseCategory: 'D',
        })
        .expect(201);

      // Viagem 1 usa v2
      await request(http)
        .post('/trips')
        .set(auth())
        .send({ ...tripPayload(), vehicleId: v2.body.id, driverId: d2.body.id })
        .expect(201);

      // Viagem 2 usa veículo original; tenta mover para v2 (conflito)
      const trip2 = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      await request(http)
        .patch(`/trips/${trip2.body.id}`)
        .set(auth())
        .send({ vehicleId: v2.body.id })
        .expect(409);
    });
  });

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  describe('Ciclo de vida da viagem', () => {
    it('inicia a viagem e registra actualDepartureAt no servidor', async () => {
      const trip = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      const before = Date.now();
      const res = await request(http).patch(`/trips/${trip.body.id}/start`).set(auth()).expect(200);
      const after = Date.now();

      expect(res.body.status).toBe('IN_PROGRESS');
      const actual = new Date(res.body.actualDepartureAt as string).getTime();
      expect(actual).toBeGreaterThanOrEqual(before);
      expect(actual).toBeLessThanOrEqual(after);
    });

    it('encerra a viagem e registra actualReturnAt no servidor', async () => {
      const trip = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      await request(http).patch(`/trips/${trip.body.id}/start`).set(auth()).expect(200);
      const before = Date.now();
      const res = await request(http).patch(`/trips/${trip.body.id}/complete`).set(auth()).expect(200);
      const after = Date.now();

      expect(res.body.status).toBe('COMPLETED');
      const actual = new Date(res.body.actualReturnAt as string).getTime();
      expect(actual).toBeGreaterThanOrEqual(before);
      expect(actual).toBeLessThanOrEqual(after);
    });

    it('cancela viagem agendada com motivo', async () => {
      const trip = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      const res = await request(http)
        .patch(`/trips/${trip.body.id}/cancel`)
        .set(auth())
        .send({ reason: 'Falta de pacientes confirmados' })
        .expect(200);
      expect(res.body.status).toBe('CANCELLED');
      expect(res.body.cancellationReason).toBe('Falta de pacientes confirmados');
    });

    it('interrompe viagem em andamento com motivo e providência', async () => {
      const trip = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      await request(http).patch(`/trips/${trip.body.id}/start`).set(auth()).expect(200);
      const res = await request(http)
        .patch(`/trips/${trip.body.id}/interrupt`)
        .set(auth())
        .send({ reason: 'Problema mecânico', action: 'Veículo rebocado, pacientes retornaram por outro meio' })
        .expect(200);
      expect(res.body.status).toBe('INTERRUPTED');
      expect(res.body.interruptionReason).toBe('Problema mecânico');
      expect(res.body.interruptionAction).toBeDefined();
    });

    it('não cancela viagem já iniciada (deve usar interrupt)', async () => {
      const trip = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      await request(http).patch(`/trips/${trip.body.id}/start`).set(auth()).expect(200);
      await request(http)
        .patch(`/trips/${trip.body.id}/cancel`)
        .set(auth())
        .send({ reason: 'Tentativa inválida' })
        .expect(409);
    });

    it('não inicia viagem já cancelada', async () => {
      const trip = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      await request(http)
        .patch(`/trips/${trip.body.id}/cancel`)
        .set(auth())
        .send({ reason: 'Cancelada' })
        .expect(200);
      await request(http).patch(`/trips/${trip.body.id}/start`).set(auth()).expect(409);
    });

    it('não encerra viagem que não está em andamento', async () => {
      const trip = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      await request(http).patch(`/trips/${trip.body.id}/complete`).set(auth()).expect(409);
    });

    it('interrupção exige motivo e providência', async () => {
      const trip = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      await request(http).patch(`/trips/${trip.body.id}/start`).set(auth()).expect(200);
      await request(http)
        .patch(`/trips/${trip.body.id}/interrupt`)
        .set(auth())
        .send({ reason: 'Problema' })
        .expect(400);
    });
  });

  // ── Aprovação de rota ─────────────────────────────────────────────────────

  describe('PATCH /trips/:id/approve-route', () => {
    it('aprova rota quando há paradas cadastradas', async () => {
      const trip = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      await request(http)
        .post(`/trips/${trip.body.id}/stops`)
        .set(auth())
        .send({
          direction: 'OUTBOUND',
          sequence: 1,
          name: 'Hospital Regional',
          address: 'Av. Principal, 100',
          municipality: 'Campinas',
          stopType: 'APPOINTMENT',
        })
        .expect(201);

      const res = await request(http)
        .patch(`/trips/${trip.body.id}/approve-route`)
        .set(auth())
        .expect(200);
      expect(res.body.routeApprovedAt).toBeDefined();
    });

    it('rejeita aprovação sem paradas', async () => {
      const trip = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      await request(http).patch(`/trips/${trip.body.id}/approve-route`).set(auth()).expect(400);
    });

    it('rejeita aprovação de viagem cancelada', async () => {
      const trip = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);
      await request(http)
        .patch(`/trips/${trip.body.id}/cancel`)
        .set(auth())
        .send({ reason: 'Cancelada' })
        .expect(200);
      await request(http).patch(`/trips/${trip.body.id}/approve-route`).set(auth()).expect(409);
    });
  });

  // ── Autorização ───────────────────────────────────────────────────────────

  describe('Autorização', () => {
    it('MOTORISTA não acessa /trips (somente /driver/trips)', async () => {
      const trip = await request(http).post('/trips').set(auth()).send(tripPayload()).expect(201);

      // Faz login como motorista
      const motoristaUser = await prisma.user.findFirstOrThrow({
        where: { role: 'MOTORISTA' },
      });
      await prisma.user.update({
        where: { id: motoristaUser.id },
        data: { isActive: true },
      });
      const motoristaLogin = await request(http)
        .post('/auth/login')
        .send({ email: motoristaUser.email, password: 'senha-ficticia-123' })
        .expect(200);
      const motoristaToken = motoristaLogin.body.accessToken as string;

      await request(http)
        .get('/trips')
        .set({ Authorization: `Bearer ${motoristaToken}` })
        .expect(403);

      await request(http)
        .get(`/trips/${trip.body.id}`)
        .set({ Authorization: `Bearer ${motoristaToken}` })
        .expect(403);
    });
  });
});
