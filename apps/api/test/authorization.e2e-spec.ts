import {
  Controller,
  Get,
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  AUTHENTICATED_KEY,
  IS_PUBLIC_KEY,
  ROLES_KEY,
} from '../src/auth/decorators';
import { PrismaService } from '../src/prisma/prisma.service';

// Dados 100% fictícios.
const PASSWORD = 'senha-ficticia-123';
const UUID = '00000000-0000-4000-8000-000000000000';

/** Controller de teste SEM política de acesso: deve ser negado (fail-closed). */
@Controller('__sem-politica')
class UnprotectedController {
  @Get()
  ping() {
    return 'aberto!';
  }
}

describe('Autorização por papel (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<INestApplication['getHttpServer']>;

  let adminToken: string;
  let driverToken: string;
  let otherDriverToken: string;
  let adminId: string;
  let driverId: string;
  let otherDriverId: string;
  let vehicleId: string;
  let patientId: string;
  let tripId: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const at = (h: number, day = 10) =>
    new Date(Date.UTC(2027, 0, day, h)).toISOString();

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [UnprotectedController],
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

  /** Emite um token válido sem passar pelo bcrypt (setup rápido). */
  const tokenFor = async (userId: string) => {
    const session = await prisma.session.create({
      data: { userId, expiresAt: new Date(Date.now() + 3_600_000) },
    });
    return app.get(JwtService).signAsync({ sub: userId, sid: session.id });
  };
  const mkUser = (name: string, email: string, role: 'ADMIN' | 'MOTORISTA') =>
    prisma.user.create({
      data: { name, email, role, passwordHash: 'hash-ficticio-nao-utilizavel' },
    });
  const mkDriver = async (n: string) => {
    const user = await mkUser(
      `Motorista ${n}`,
      `m${n}@teste.local`,
      'MOTORISTA',
    );
    const driver = await prisma.driver.create({ data: { userId: user.id } });
    return {
      userId: user.id,
      driverId: driver.id,
      token: await tokenFor(user.id),
    };
  };

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "audit_logs","sessions","confirmation_logs","trip_companions","patient_trips","trip_stops","trips","vehicles","drivers","patients","users" CASCADE',
    );

    const admin = await mkUser('Admin Teste', 'admin@teste.local', 'ADMIN');
    adminId = admin.id;
    adminToken = await tokenFor(admin.id);

    const a = await mkDriver('a');
    const b = await mkDriver('b');
    driverId = a.driverId;
    driverToken = a.token;
    otherDriverId = b.driverId;
    otherDriverToken = b.token;

    vehicleId = (
      await prisma.vehicle.create({
        data: { plate: 'AAA0A00', description: 'Van', capacity: 8 },
      })
    ).id;
    patientId = (
      await prisma.patient.create({
        data: { name: 'Paciente Teste', birthDate: new Date('1960-01-01') },
      })
    ).id;
    tripId = (
      await prisma.trip.create({
        data: {
          vehicleId,
          driverId,
          municipalPickupPoint: 'Praça Central (fictícia)',
          plannedDepartureAt: new Date(at(9)),
          plannedReturnStartAt: new Date(at(15)),
        },
      })
    ).id;
  });

  describe('Auditoria e correção de horário', () => {
    it('persiste a correção auditada e não registra uma alteração rejeitada', async () => {
      await prisma.trip.update({ where: { id: tripId }, data: { status: 'COMPLETED', actualDepartureAt: new Date('2025-01-01T09:00:00Z'), actualReturnAt: new Date('2025-01-01T15:00:00Z') } });
      await request(http).patch(`/trips/${tripId}/actual-times`).set(auth(adminToken)).send({ actualDepartureAt: '2025-01-01T08:00:00Z', reason: 'Ajuste fictício' }).expect(200);
      const entries = await prisma.auditLog.findMany({ where: { entityId: tripId, action: 'TRIP_ACTUAL_TIMES_CORRECTED' } });
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ actorUserId: adminId, reason: 'Ajuste fictício', changes: { before: { actualDepartureAt: '2025-01-01T09:00:00.000Z' }, after: { actualDepartureAt: '2025-01-01T08:00:00.000Z' } } });
      await request(http).patch(`/trips/${tripId}/actual-times`).set(auth(adminToken)).send({ actualDepartureAt: '2025-01-01T16:00:00Z', reason: 'Inválido' }).expect(400);
      expect(await prisma.auditLog.count({ where: { entityId: tripId, action: 'TRIP_ACTUAL_TIMES_CORRECTED' } })).toBe(1);
      expect((await prisma.trip.findUniqueOrThrow({ where: { id: tripId } })).actualDepartureAt?.toISOString()).toBe('2025-01-01T08:00:00.000Z');
      const result = await request(http).get('/audit?action=TRIP_ACTUAL_TIMES_CORRECTED').set(auth(adminToken)).expect(200);
      expect(result.body.total).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('política fail-closed', () => {
    it('toda rota da API declara explicitamente sua política de acesso', () => {
      const reflector = app.get(Reflector);
      const missing: string[] = [];
      let inspected = 0;

      for (const mod of app.get(ModulesContainer).values()) {
        for (const wrapper of mod.controllers.values()) {
          const proto = wrapper.metatype?.prototype as Record<string, unknown>;
          if (!proto || wrapper.metatype === UnprotectedController) continue;
          for (const name of Object.getOwnPropertyNames(proto)) {
            const handler = proto[name] as () => unknown;
            if (typeof handler !== 'function') continue;
            if (Reflect.getMetadata(METHOD_METADATA, handler) === undefined)
              continue;
            inspected++;
            const targets = [handler, wrapper.metatype!];
            const declared =
              reflector.getAllAndOverride(IS_PUBLIC_KEY, targets) ||
              reflector.getAllAndOverride(AUTHENTICATED_KEY, targets) ||
              (reflector.getAllAndOverride<unknown[]>(ROLES_KEY, targets)
                ?.length ?? 0) > 0;
            if (!declared) {
              const path = Reflect.getMetadata(PATH_METADATA, handler);
              missing.push(
                `${wrapper.metatype!.name}.${name} (${RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler)]} ${path})`,
              );
            }
          }
        }
      }
      expect(inspected).toBeGreaterThan(15);
      expect(missing).toEqual([]);
    });

    it('rota sem @Public/@Authenticated/@Roles é negada, mesmo para ADMIN', async () => {
      await request(http)
        .get('/__sem-politica')
        .set(auth(adminToken))
        .expect(403);
      await request(http)
        .get('/__sem-politica')
        .set(auth(driverToken))
        .expect(403);
      await request(http).get('/__sem-politica').expect(401);
    });
  });

  // -------------------------------------------------------------------------
  describe('rotas administrativas (acesso negado)', () => {
    // [método, caminho]. IDs são válidos só no formato: a autorização é
    // avaliada ANTES da validação e da busca, então a resposta é sempre 403.
    const adminRoutes: Array<[string, string]> = [
      ['get', '/vehicles'],
      ['post', '/vehicles'],
      ['patch', `/vehicles/${UUID}`],
      ['patch', `/vehicles/${UUID}/inactivate`],
      ['get', '/drivers'],
      ['post', '/drivers'],
      ['patch', `/drivers/${UUID}`],
      ['patch', `/drivers/${UUID}/inactivate`],
      ['get', '/patients'],
      ['post', '/patients'],
      ['patch', `/patients/${UUID}`],
      ['patch', `/patients/${UUID}/inactivate`],
      ['get', '/audit'],
      ['get', `/trips/${UUID}/observations`],
      ['patch', `/trips/${UUID}/actual-times`],
      ['get', '/trips'],
      ['post', '/trips'],
      ['patch', `/trips/${UUID}/cancel`],
      ['post', '/users'],
    ];

    it.each(adminRoutes)(
      'MOTORISTA recebe 403 em %s %s',
      async (method, path) => {
        const req = (
          request(http) as unknown as Record<
            string,
            (p: string) => request.Test
          >
        )[method](path);
        await req.set(auth(driverToken)).send({}).expect(403);
      },
    );

    it.each(adminRoutes)(
      'anônimo recebe 401 em %s %s',
      async (method, path) => {
        const req = (
          request(http) as unknown as Record<
            string,
            (p: string) => request.Test
          >
        )[method](path);
        await req.send({}).expect(401);
      },
    );

    it('acesso negado não produz nenhum efeito colateral', async () => {
      const before = {
        vehicles: await prisma.vehicle.count(),
        drivers: await prisma.driver.count(),
        patients: await prisma.patient.count(),
        trips: await prisma.trip.count(),
        users: await prisma.user.count(),
      };

      const attempts = [
        request(http)
          .post('/vehicles')
          .send({ plate: 'ZZZ9Z99', description: 'x', capacity: 5 }),
        request(http).post('/drivers').send({
          name: 'Intruso',
          email: 'x@teste.local',
          password: PASSWORD,
        }),
        request(http)
          .post('/patients')
          .send({ name: 'Intruso', birthDate: '1990-01-01' }),
        request(http)
          .post('/trips')
          .send({
            vehicleId,
            driverId,
            municipalPickupPoint: 'x',
            plannedDepartureAt: at(9, 20),
            plannedReturnStartAt: at(15, 20),
          }),
        request(http).post('/users').send({
          name: 'Intruso',
          email: 'adm@teste.local',
          password: PASSWORD,
          role: 'ADMIN',
        }),
        request(http)
          .patch(`/trips/${tripId}/cancel`)
          .send({ reason: 'sabotagem' }),
        request(http).patch(`/vehicles/${vehicleId}/inactivate`).send({}),
        request(http).patch(`/drivers/${driverId}/inactivate`).send({}),
        request(http).patch(`/patients/${patientId}/inactivate`).send({}),
      ];
      for (const a of attempts) await a.set(auth(driverToken)).expect(403);

      expect({
        vehicles: await prisma.vehicle.count(),
        drivers: await prisma.driver.count(),
        patients: await prisma.patient.count(),
        trips: await prisma.trip.count(),
        users: await prisma.user.count(),
      }).toEqual(before);
      expect(
        (await prisma.trip.findUniqueOrThrow({ where: { id: tripId } })).status,
      ).toBe('SCHEDULED');
      expect(
        (await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } }))
          .status,
      ).toBe('ACTIVE');
      expect(
        (await prisma.patient.findUniqueOrThrow({ where: { id: patientId } }))
          .isActive,
      ).toBe(true);
      expect(
        (await prisma.driver.findUniqueOrThrow({ where: { id: driverId } }))
          .isActive,
      ).toBe(true);
    });

    it('MOTORISTA não escala o próprio papel nem cria ADMIN', async () => {
      await request(http)
        .post('/users')
        .set(auth(driverToken))
        .send({
          name: 'Eu Admin',
          email: 'eu@teste.local',
          password: PASSWORD,
          role: 'ADMIN',
        })
        .expect(403);
      const me = await request(http)
        .get('/auth/me')
        .set(auth(driverToken))
        .expect(200);
      expect(me.body.role).toBe('MOTORISTA');
    });

    it('o ADMIN continua com acesso a todas as rotas administrativas', async () => {
      for (const path of ['/vehicles', '/drivers', '/patients', '/trips']) {
        await request(http).get(path).set(auth(adminToken)).expect(200);
      }
    });

    it('o papel vem do banco: rebaixar um ADMIN revoga o acesso com o mesmo token', async () => {
      await request(http).get('/vehicles').set(auth(adminToken)).expect(200);
      await prisma.user.update({
        where: { id: adminId },
        data: { role: 'MOTORISTA' },
      });
      await request(http).get('/vehicles').set(auth(adminToken)).expect(403);
    });
  });

  // -------------------------------------------------------------------------
  describe('rotas do motorista', () => {
    it('ADMIN não acessa rotas exclusivas do motorista (403)', async () => {
      await request(http)
        .get('/driver/trips')
        .set(auth(adminToken))
        .expect(403);
      await request(http)
        .get(`/driver/trips/${tripId}`)
        .set(auth(adminToken))
        .expect(403);
    });

    it('anônimo recebe 401', async () => {
      await request(http).get('/driver/trips').expect(401);
      await request(http).get(`/driver/trips/${tripId}`).expect(401);
    });

    it('lista somente as viagens atribuídas ao motorista autenticado', async () => {
      await request(http)
        .post('/trips')
        .set(auth(adminToken))
        .send({
          vehicleId,
          driverId: otherDriverId,
          municipalPickupPoint: 'Outro ponto',
          plannedDepartureAt: at(9, 20),
          plannedReturnStartAt: at(15, 20),
        })
        .expect(201);

      const mine = await request(http)
        .get('/driver/trips')
        .set(auth(driverToken))
        .expect(200);
      expect(mine.body.map((t: { id: string }) => t.id)).toEqual([tripId]);
      const theirs = await request(http)
        .get('/driver/trips')
        .set(auth(otherDriverToken))
        .expect(200);
      expect(theirs.body).toHaveLength(1);
      expect(theirs.body[0].id).not.toBe(tripId);
    });

    it('viagem de outro motorista responde 404, indistinguível de inexistente', async () => {
      const other = await request(http)
        .get(`/driver/trips/${tripId}`)
        .set(auth(otherDriverToken));
      const missing = await request(http)
        .get(`/driver/trips/${UUID}`)
        .set(auth(otherDriverToken));
      expect(other.status).toBe(404);
      expect(missing.status).toBe(404);
      expect(other.body).toEqual(missing.body);
      await request(http)
        .get(`/driver/trips/${tripId}`)
        .set(auth(driverToken))
        .expect(200);
    });

    it('detalhe mostra o necessário ao transporte e oculta dados restritos', async () => {
      const patient = await prisma.patient.update({
        where: { id: patientId },
        data: {
          phone: '(00) 90000-0000',
          susCardNumber: 'SUS-FICTICIO-123',
          address: 'Rua Secreta Fictícia, 999',
          operationalNotes: 'Observação interna fictícia',
          usesWheelchair: true,
        },
      });
      const stop = await prisma.tripStop.create({
        data: {
          tripId,
          direction: 'OUTBOUND',
          sequence: 1,
          name: 'Hospital Fictício',
          address: 'Av. Exemplo, 1',
          municipality: 'Cidade Exemplo',
          stopType: 'APPOINTMENT',
        },
      });
      const pt = await prisma.patientTrip.create({
        data: {
          tripId,
          patientId: patient.id,
          appointmentLocationName: 'Hospital Fictício',
          appointmentAddress: 'Av. Exemplo, 1',
          appointmentMunicipality: 'Cidade Exemplo',
          appointmentAt: new Date(at(11)),
          priority: 'HIGH',
          priorityJustification: 'Justificativa interna fictícia',
          priorityDefinedByUserId: adminId,
          priorityDefinedAt: new Date(),
          outboundStopId: stop.id,
        },
      });
      await prisma.tripCompanion.create({
        data: {
          patientTripId: pt.id,
          name: 'Acompanhante Teste',
          phone: '(00) 98888-8888',
        },
      });
      await prisma.trip.update({
        where: { id: tripId },
        data: { routeApprovedAt: new Date(), routeApprovedByUserId: adminId },
      });

      const res = await request(http)
        .get(`/driver/trips/${tripId}`)
        .set(auth(driverToken))
        .expect(200);
      const json = JSON.stringify(res.body);

      const p = res.body.patientTrips[0];
      expect(p.patient).toEqual({
        name: 'Paciente Teste',
        phone: '(00) 90000-0000',
        usesWheelchair: true,
        hasReducedMobility: false,
        needsBoardingAssistance: false,
      });
      expect(p.companions).toEqual([
        {
          name: 'Acompanhante Teste',
          phone: '(00) 98888-8888',
        },
      ]);
      expect(res.body.stops).toHaveLength(1);

      for (const forbidden of [
        'susCardNumber',
        'SUS-FICTICIO',
        'Rua Secreta',
        'birthDate',
        'cpf',
        'Observação interna',
        'priority',
        'Justificativa interna',
        'confirmationStatus',
        'passwordHash',
        'email',
        'licenseNumber',
        'notes',
        'relationship',
      ]) {
        expect(json).not.toContain(forbidden);
      }
    });

    it('rota só é exibida depois de aprovada pelo ADMIN (RN-07)', async () => {
      await prisma.tripStop.create({
        data: {
          tripId,
          direction: 'OUTBOUND',
          sequence: 1,
          name: 'Parada',
          address: 'Rua A',
          municipality: 'Cidade',
          stopType: 'APPOINTMENT',
        },
      });
      const before = await request(http)
        .get(`/driver/trips/${tripId}`)
        .set(auth(driverToken))
        .expect(200);
      expect(before.body.stops).toEqual([]);
      await prisma.trip.update({
        where: { id: tripId },
        data: { routeApprovedAt: new Date(), routeApprovedByUserId: adminId },
      });
      const after = await request(http)
        .get(`/driver/trips/${tripId}`)
        .set(auth(driverToken))
        .expect(200);
      expect(after.body.stops).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('rotas comuns a qualquer usuário autenticado', () => {
    it('/auth/me e /auth/logout aceitam ADMIN e MOTORISTA, mas não anônimos', async () => {
      for (const t of [adminToken, driverToken]) {
        await request(http).get('/auth/me').set(auth(t)).expect(200);
      }
      await request(http).get('/auth/me').expect(401);
      await request(http).post('/auth/logout').expect(401);
      await request(http)
        .post('/auth/logout')
        .set(auth(driverToken))
        .expect(204);
    });

    it('rotas públicas continuam abertas', async () => {
      await request(http).get('/').expect(200);
      await request(http)
        .post('/auth/login')
        .send({ email: 'x@teste.local', password: 'qualquer' })
        .expect(401);
    });
  });
});
