import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const admin = {
  name: 'Admin Veículos Teste',
  email: 'admin-veiculos@teste.local',
  password: 'senha-ficticia-123',
};
const vehicleInput = {
  plate: 'ABC1D23',
  description: 'Van de passageiros',
  capacity: 12,
};

describe('Veículos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let adminToken: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
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
    const login = await request(http)
      .post('/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(200);
    adminToken = login.body.accessToken as string;
  });

  it('cadastra, lista, edita e inativa mantendo o registro no PostgreSQL', async () => {
    const created = await request(http)
      .post('/vehicles')
      .set(auth(adminToken))
      .send(vehicleInput)
      .expect(201);

    expect(created.body).toMatchObject({
      plate: 'ABC1D23',
      description: 'Van de passageiros',
      capacity: 12,
      status: 'ACTIVE',
    });
    expect((await request(http).get('/vehicles').set(auth(adminToken)).expect(200)).body)
      .toEqual([created.body]);

    await request(http)
      .patch(`/vehicles/${created.body.id}`)
      .set(auth(adminToken))
      .send({ description: 'Van adaptada', capacity: 14 })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ description: 'Van adaptada', capacity: 14 });
      });

    await request(http)
      .patch(`/vehicles/${created.body.id}/inactivate`)
      .set(auth(adminToken))
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('INACTIVE'));

    const persisted = await prisma.vehicle.findUniqueOrThrow({
      where: { id: created.body.id as string },
    });
    expect(persisted).toMatchObject({
      plate: 'ABC1D23',
      description: 'Van adaptada',
      capacity: 14,
      status: 'INACTIVE',
    });
    expect(await prisma.auditLog.count({ where: { entityId: persisted.id } })).toBe(3);
  });

  it('valida capacidade, placa duplicada e exige papel ADMIN', async () => {
    await request(http)
      .post('/vehicles')
      .set(auth(adminToken))
      .send({ ...vehicleInput, capacity: 0 })
      .expect(400);

    await request(http)
      .post('/vehicles')
      .set(auth(adminToken))
      .send(vehicleInput)
      .expect(201);
    await request(http)
      .post('/vehicles')
      .set(auth(adminToken))
      .send({ ...vehicleInput, plate: 'abc1d23' })
      .expect(409);

    await request(http).get('/vehicles').expect(401);
    await request(http)
      .post('/vehicles')
      .set(auth(adminToken))
      .send({ ...vehicleInput, extra: true })
      .expect(400);
  });
});