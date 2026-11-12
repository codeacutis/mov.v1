import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Dados 100% fictícios.
const PASSWORD = 'senha-ficticia-123';

describe('Agendamento de viagens (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<INestApplication['getHttpServer']>;

  let adminToken: string;
  let driverAToken: string;
  let driverBToken: string;
  let driverA: { id: string; userId: string };
  let driverB: { id: string; userId: string };
  let vehicle1: string;
  let vehicle2: string;
  let patientIds: string[];

  const at = (h: number, day = 1) =>
    new Date(Date.UTC(2027, 0, day, h)).toISOString();
  const tripBody = (over: Record<string, unknown> = {}) => ({
    driverId: driverA.id,
    vehicleId: vehicle1,
    municipalPickupPoint: 'Praça Central (fictícia)',
    plannedDepartureAt: at(9),
    plannedReturnStartAt: at(15),
    plannedReturnEndAt: at(19),
    ...over,
  });
  const patientBody = (i: number, over: Record<string, unknown> = {}) => ({
    patientId: patientIds[i],
    appointmentLocationName: 'Hospital Fictício',
    appointmentAddress: 'Rua Exemplo, 100',
    appointmentMunicipality: 'Cidade Exemplo',
    appointmentAt: at(11),
    priority: 'HIGH',
    priorityJustification: 'Consulta de retorno',
    ...over,
  });

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const login = async (email: string) =>
    (
      await request(http)
        .post('/auth/login')
        .send({ email, password: PASSWORD })
        .expect(200)
    ).body.accessToken as string;
  const createTrip = (over: Record<string, unknown> = {}) =>
    request(http).post('/trips').set(auth(adminToken)).send(tripBody(over));

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
      'TRUNCATE "audit_logs","trip_companions","patient_trips","trips","patients","vehicles","drivers","users" CASCADE',
    );
    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    await prisma.user.create({
      data: {
        name: 'Admin Teste',
        email: 'admin@teste.local',
        passwordHash,
        role: 'ADMIN',
      },
    });
    const mk = async (n: string) => {
      const u = await prisma.user.create({
        data: {
          name: `Motorista ${n}`,
          email: `m${n.toLowerCase()}@teste.local`,
          passwordHash,
          role: 'MOTORISTA',
        },
      });
      const d = await prisma.driver.create({ data: { userId: u.id } });
      return { id: d.id, userId: u.id };
    };
    driverA = await mk('A');
    driverB = await mk('B');
    vehicle1 = (
      await prisma.vehicle.create({
        data: { plate: 'AAA0A00', description: 'Van 1', capacity: 3 },
      })
    ).id;
    vehicle2 = (
      await prisma.vehicle.create({
        data: { plate: 'BBB0B00', description: 'Van 2', capacity: 3 },
      })
    ).id;
    patientIds = [];
    for (let i = 0; i < 6; i++) {
      patientIds.push(
        (
          await prisma.patient.create({
            data: {
              name: `Paciente ${i}`,
              birthDate: new Date('1960-01-01'),
              phone: '(00) 00000-000' + i,
              cpf: `000000000${i}${i}`,
              susCardNumber: `SUS-FICTICIO-${i}`,
              address: 'Endereço completo fictício',
            },
          })
        ).id,
      );
    }
    adminToken = await login('admin@teste.local');
    driverAToken = await login('ma@teste.local');
    driverBToken = await login('mb@teste.local');
  });

  describe('autenticação e autorização', () => {
    it('exige token', async () => {
      await request(http).get('/trips').expect(401);
    });

    it('rejeita senha errada e e-mail inexistente com a mesma resposta', async () => {
      const a = await request(http)
        .post('/auth/login')
        .send({ email: 'admin@teste.local', password: 'x' });
      const b = await request(http)
        .post('/auth/login')
        .send({ email: 'nao@existe.local', password: 'x' });
      expect(a.status).toBe(401);
      expect(b.status).toBe(401);
      expect(a.body.message).toBe(b.body.message);
    });

    it('MOTORISTA não cria nem cancela viagens (403)', async () => {
      await request(http)
        .post('/trips')
        .set(auth(driverAToken))
        .send(tripBody())
        .expect(403);
      const { body } = await createTrip().expect(201);
      await request(http)
        .post(`/trips/${body.id}/cancel`)
        .set(auth(driverAToken))
        .send({ reason: 'x' })
        .expect(403);
    });

    it('token de usuário desativado deixa de valer imediatamente', async () => {
      await prisma.user.update({
        where: { id: driverA.userId },
        data: { isActive: false },
      });
      await request(http).get('/trips').set(auth(driverAToken)).expect(401);
    });
  });

  describe('criação e validação', () => {
    it('cria viagem e audita', async () => {
      const res = await createTrip().expect(201);
      expect(res.body.status).toBe('SCHEDULED');
      expect(res.body.occupiedSeats).toBe(0);
      const log = await prisma.auditLog.findFirst({
        where: { entityId: res.body.id },
      });
      expect(log?.action).toBe('TRIP_CREATED');
    });

    it('rejeita ordem de horários inválida (422)', async () => {
      await createTrip({ plannedReturnStartAt: at(8) }).expect(422);
    });

    it('rejeita data sem fuso e campos desconhecidos (400)', async () => {
      await createTrip({ plannedDepartureAt: '2027-01-01T09:00:00' }).expect(
        400,
      );
      await createTrip({ status: 'COMPLETED' }).expect(400);
    });

    it('bloqueia veículo em manutenção e motorista inativo (422)', async () => {
      await prisma.vehicle.update({
        where: { id: vehicle1 },
        data: { status: 'IN_MAINTENANCE' },
      });
      await createTrip().expect(422);
      await prisma.driver.update({
        where: { id: driverA.id },
        data: { isActive: false },
      });
      await createTrip({ vehicleId: vehicle2 }).expect(422);
    });
  });

  describe('conflitos de agenda', () => {
    it('bloqueia sobreposição do mesmo motorista (409)', async () => {
      await createTrip().expect(201);
      await createTrip({
        vehicleId: vehicle2,
        plannedDepartureAt: at(18),
        plannedReturnStartAt: at(20),
        plannedReturnEndAt: at(22),
      }).expect(409);
    });

    it('bloqueia sobreposição do mesmo veículo (409)', async () => {
      await createTrip().expect(201);
      await createTrip({
        driverId: driverB.id,
        plannedDepartureAt: at(10),
      }).expect(409);
    });

    it('permite viagens que apenas encostam no limite', async () => {
      await createTrip().expect(201);
      await createTrip({
        plannedDepartureAt: at(19),
        plannedReturnStartAt: at(20),
        plannedReturnEndAt: at(22),
      }).expect(201);
    });

    it('viagem cancelada libera a agenda', async () => {
      const { body } = await createTrip().expect(201);
      await request(http)
        .post(`/trips/${body.id}/cancel`)
        .set(auth(adminToken))
        .send({ reason: 'Teste' })
        .expect(200);
      await createTrip().expect(201);
    });

    it('requisições simultâneas: só uma ocupa o mesmo motorista; nenhum 500', async () => {
      const responses = await Promise.all(
        [vehicle1, vehicle2, vehicle1, vehicle2, vehicle1, vehicle2].map(
          (v, i) =>
            createTrip({
              vehicleId: v,
              plannedDepartureAt: at(9, 1),
              plannedReturnEndAt: at(19 - (i % 2)),
            }),
        ),
      );
      const statuses = responses.map((r) => r.status);
      expect(statuses.filter((s) => s === 201)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(5);
      expect(await prisma.trip.count()).toBe(1);
    });

    it('alteração que gera conflito é recusada (409)', async () => {
      await createTrip().expect(201);
      const other = await createTrip({
        plannedDepartureAt: at(9, 3),
        plannedReturnStartAt: at(15, 3),
        plannedReturnEndAt: at(19, 3),
      }).expect(201);
      await request(http)
        .patch(`/trips/${other.body.id}`)
        .set(auth(adminToken))
        .send({
          plannedDepartureAt: at(10, 1),
          plannedReturnStartAt: at(15, 1),
          plannedReturnEndAt: at(20, 1),
        })
        .expect(409);
    });
  });

  describe('alteração de horários e cancelamento', () => {
    it('altera horário planejado e audita valores antigo e novo', async () => {
      const { body } = await createTrip().expect(201);
      await request(http)
        .patch(`/trips/${body.id}`)
        .set(auth(adminToken))
        .send({ plannedReturnEndAt: at(20), reason: 'Ajuste da Secretaria' })
        .expect(200);
      const log = await prisma.auditLog.findFirst({
        where: { action: 'TRIP_UPDATED' },
      });
      expect(log?.reason).toBe('Ajuste da Secretaria');
      expect(log?.changes).toEqual({
        before: { plannedReturnEndAt: at(19) },
        after: { plannedReturnEndAt: at(20) },
      });
    });

    it('não altera horário de viagem já iniciada (409)', async () => {
      const { body } = await createTrip().expect(201);
      await prisma.trip.update({
        where: { id: body.id },
        data: { status: 'IN_PROGRESS' },
      });
      await request(http)
        .patch(`/trips/${body.id}`)
        .set(auth(adminToken))
        .send({ plannedReturnEndAt: at(20) })
        .expect(409);
    });

    it('cancelar exige motivo, só vale uma vez e não vale após o início', async () => {
      const { body } = await createTrip().expect(201);
      await request(http)
        .post(`/trips/${body.id}/cancel`)
        .set(auth(adminToken))
        .send({})
        .expect(400);
      const ok = await request(http)
        .post(`/trips/${body.id}/cancel`)
        .set(auth(adminToken))
        .send({ reason: 'Veículo quebrou' })
        .expect(200);
      expect(ok.body.status).toBe('CANCELLED');
      await request(http)
        .post(`/trips/${body.id}/cancel`)
        .set(auth(adminToken))
        .send({ reason: 'de novo' })
        .expect(409);

      const started = await createTrip({
        plannedDepartureAt: at(9, 5),
        plannedReturnStartAt: at(15, 5),
        plannedReturnEndAt: at(19, 5),
      }).expect(201);
      await prisma.trip.update({
        where: { id: started.body.id },
        data: { status: 'IN_PROGRESS' },
      });
      await request(http)
        .post(`/trips/${started.body.id}/cancel`)
        .set(auth(adminToken))
        .send({ reason: 'x' })
        .expect(409);
      expect(
        await prisma.auditLog.count({ where: { action: 'TRIP_CANCELLED' } }),
      ).toBe(1);
    });
  });

  describe('pacientes, acompanhantes e capacidade', () => {
    it('conta pacientes e acompanhantes (motorista fora) e rejeita excesso', async () => {
      const { body } = await createTrip().expect(201); // capacidade 3
      await request(http)
        .post(`/trips/${body.id}/patients`)
        .set(auth(adminToken))
        .send(
          patientBody(0, {
            companions: [{ name: 'Acompanhante 0', phone: '(00) 00000-0000' }],
          }),
        )
        .expect(201);
      const two = await request(http)
        .post(`/trips/${body.id}/patients`)
        .set(auth(adminToken))
        .send(patientBody(1))
        .expect(201);
      expect(two.body.occupiedSeats).toBe(3);
      await request(http)
        .post(`/trips/${body.id}/patients`)
        .set(auth(adminToken))
        .send(patientBody(2))
        .expect(422);
    });

    it('acompanhante extra também respeita a capacidade', async () => {
      const { body } = await createTrip({ vehicleId: vehicle1 }).expect(201);
      let res = await request(http)
        .post(`/trips/${body.id}/patients`)
        .set(auth(adminToken))
        .send(patientBody(0))
        .expect(201);
      const ptId = res.body.patientTrips[0].id;
      const comp = { name: 'Acomp', phone: '(00) 00000-0001' };
      await request(http)
        .post(`/trips/${body.id}/patients/${ptId}/companions`)
        .set(auth(adminToken))
        .send(comp)
        .expect(201);
      await request(http)
        .post(`/trips/${body.id}/patients/${ptId}/companions`)
        .set(auth(adminToken))
        .send(comp)
        .expect(201);
      await request(http)
        .post(`/trips/${body.id}/patients/${ptId}/companions`)
        .set(auth(adminToken))
        .send(comp)
        .expect(422);
      res = await request(http)
        .get(`/trips/${body.id}`)
        .set(auth(adminToken))
        .expect(200);
      expect(res.body.occupiedSeats).toBe(3);
    });

    it('inclusões simultâneas nunca excedem a capacidade', async () => {
      const { body } = await createTrip().expect(201); // capacidade 3
      const results = await Promise.all(
        [0, 1, 2, 3, 4, 5].map((i) =>
          request(http)
            .post(`/trips/${body.id}/patients`)
            .set(auth(adminToken))
            .send(patientBody(i)),
        ),
      );
      expect(results.filter((r) => r.status === 201)).toHaveLength(3);
      expect(results.filter((r) => r.status === 422)).toHaveLength(3);
      expect(await prisma.patientTrip.count()).toBe(3);
    });

    it('não duplica o mesmo paciente na viagem (409)', async () => {
      const { body } = await createTrip().expect(201);
      await request(http)
        .post(`/trips/${body.id}/patients`)
        .set(auth(adminToken))
        .send(patientBody(0))
        .expect(201);
      await request(http)
        .post(`/trips/${body.id}/patients`)
        .set(auth(adminToken))
        .send(patientBody(0))
        .expect(409);
    });

    it('troca de veículo para um que não comporta os passageiros é recusada', async () => {
      const small = await prisma.vehicle.create({
        data: { plate: 'CCC0C00', description: 'Carro', capacity: 1 },
      });
      const { body } = await createTrip().expect(201);
      await request(http)
        .post(`/trips/${body.id}/patients`)
        .set(auth(adminToken))
        .send(patientBody(0))
        .expect(201);
      await request(http)
        .post(`/trips/${body.id}/patients`)
        .set(auth(adminToken))
        .send(patientBody(1))
        .expect(201);
      await request(http)
        .patch(`/trips/${body.id}`)
        .set(auth(adminToken))
        .send({ vehicleId: small.id })
        .expect(422);
    });

    it('alterar prioridade exige justificativa e é auditada com antes/depois', async () => {
      const { body } = await createTrip().expect(201);
      const res = await request(http)
        .post(`/trips/${body.id}/patients`)
        .set(auth(adminToken))
        .send(patientBody(0))
        .expect(201);
      const ptId = res.body.patientTrips[0].id;
      await request(http)
        .patch(`/trips/${body.id}/patients/${ptId}`)
        .set(auth(adminToken))
        .send({ priority: 'LOW' })
        .expect(400);
      await request(http)
        .patch(`/trips/${body.id}/patients/${ptId}`)
        .set(auth(adminToken))
        .send({
          priority: 'LOW',
          priorityJustification: 'Reavaliada pela Secretaria',
        })
        .expect(200);
      const log = await prisma.auditLog.findFirst({
        where: { action: 'PATIENT_TRIP_PRIORITY_CHANGED' },
      });
      expect(log?.changes).toMatchObject({
        before: { priority: 'HIGH' },
        after: { priority: 'LOW' },
      });
    });

    it('não aceita pacientes em viagem cancelada (409)', async () => {
      const { body } = await createTrip().expect(201);
      await request(http)
        .post(`/trips/${body.id}/cancel`)
        .set(auth(adminToken))
        .send({ reason: 'Teste' })
        .expect(200);
      await request(http)
        .post(`/trips/${body.id}/patients`)
        .set(auth(adminToken))
        .send(patientBody(0))
        .expect(409);
    });
  });

  describe('visão do motorista (menor privilégio)', () => {
    it('lista só as viagens atribuídas e oculta dados restritos', async () => {
      const mine = await createTrip().expect(201);
      const others = await createTrip({
        driverId: driverB.id,
        vehicleId: vehicle2,
      }).expect(201);
      await request(http)
        .post(`/trips/${mine.body.id}/patients`)
        .set(auth(adminToken))
        .send(
          patientBody(0, {
            companions: [{ name: 'Acomp', phone: '(00) 00000-0000' }],
          }),
        )
        .expect(201);

      const list = await request(http)
        .get('/trips')
        .set(auth(driverAToken))
        .expect(200);
      expect(list.body.map((t: { id: string }) => t.id)).toEqual([
        mine.body.id,
      ]);

      await request(http)
        .get(`/trips/${others.body.id}`)
        .set(auth(driverAToken))
        .expect(404);
      await request(http)
        .get(`/trips/${others.body.id}`)
        .set(auth(driverBToken))
        .expect(200);

      const detail = await request(http)
        .get(`/trips/${mine.body.id}`)
        .set(auth(driverAToken))
        .expect(200);
      const json = JSON.stringify(detail.body);
      for (const forbidden of [
        'cpf',
        'susCardNumber',
        'SUS-FICTICIO',
        'Endereço completo fictício',
        'birthDate',
        'priorityJustification',
        'Consulta de retorno',
      ]) {
        expect(json).not.toContain(forbidden);
      }
      expect(detail.body.patientTrips[0].patient.phone).toBeDefined();
      expect(detail.body.patientTrips[0].companions[0].phone).toBeDefined();
    });

    it('visão do ADMIN também não expõe CPF, Cartão SUS ou endereço do paciente', async () => {
      const { body } = await createTrip().expect(201);
      await request(http)
        .post(`/trips/${body.id}/patients`)
        .set(auth(adminToken))
        .send(patientBody(0))
        .expect(201);
      const detail = await request(http)
        .get(`/trips/${body.id}`)
        .set(auth(adminToken))
        .expect(200);
      const json = JSON.stringify(detail.body);
      for (const forbidden of [
        'cpf',
        'susCardNumber',
        'SUS-FICTICIO',
        'Endereço completo fictício',
      ]) {
        expect(json).not.toContain(forbidden);
      }
      expect(detail.body.patientTrips[0].priorityJustification).toBeDefined();
    });
  });
});
