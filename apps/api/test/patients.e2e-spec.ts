import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const admin = { name: 'Admin Pacientes', email: 'admin-pac@teste.local', password: 'senha-ficticia-123' };

describe('Pacientes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let token: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
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
    const res = await request(http).post('/auth/login').send({ email: admin.email, password: admin.password }).expect(200);
    token = res.body.accessToken as string;
  });

  const base = {
    name: 'Maria da Silva',
    birthDate: '1980-05-10',
    phone: '(11) 91234-5678',
    susCardNumber: '123456789012345',
    address: 'Rua das Flores, nº 10, Centro, Cidade/SP, CEP 01000-000',
    usesWheelchair: false,
    hasReducedMobility: true,
    needsBoardingAssistance: false,
    operationalNotes: 'Precisa de assento na frente',
  };

  it('cadastra um paciente com todos os campos e persiste no banco', async () => {
    const res = await request(http).post('/patients').set(auth()).send(base).expect(201);

    expect(res.body).toMatchObject({ name: 'Maria da Silva', hasReducedMobility: true, isActive: true });

    const row = await prisma.patient.findUniqueOrThrow({ where: { id: res.body.id as string } });
    expect(row.name).toBe('Maria da Silva');
    expect(row.address).toBe(base.address);
    expect(await prisma.auditLog.count({ where: { entityId: row.id, action: 'PATIENT_CREATED' } })).toBe(1);
  });

  it('edita um paciente existente', async () => {
    const created = await request(http).post('/patients').set(auth()).send(base).expect(201);

    const updated = await request(http)
      .patch(`/patients/${created.body.id}`)
      .set(auth())
      .send({ name: 'Maria Souza', usesWheelchair: true })
      .expect(200);

    expect(updated.body).toMatchObject({ name: 'Maria Souza', usesWheelchair: true });
    expect(await prisma.auditLog.count({ where: { entityId: created.body.id as string, action: 'PATIENT_UPDATED' } })).toBe(1);
  });

  it('inativa um paciente sem removê-lo do banco', async () => {
    const created = await request(http).post('/patients').set(auth()).send(base).expect(201);

    await request(http).patch(`/patients/${created.body.id}/inactivate`).set(auth()).expect(200)
      .expect(({ body }) => expect(body.isActive).toBe(false));

    const row = await prisma.patient.findUniqueOrThrow({ where: { id: created.body.id as string } });
    expect(row.isActive).toBe(false);
  });

  it('rejeita paciente sem nome e sem data de nascimento', async () => {
    await request(http).post('/patients').set(auth()).send({ phone: '(11) 91234-5678' }).expect(400);
    await request(http).post('/patients').set(auth()).send({ name: 'Teste' }).expect(400);
  });

  it('rejeita campos extras (whitelist)', async () => {
    await request(http).post('/patients').set(auth()).send({ ...base, campoInvalido: true }).expect(400);
  });

  it('exige autenticação', async () => {
    await request(http).get('/patients').expect(401);
    await request(http).post('/patients').send(base).expect(401);
  });

  it('lista pacientes com paginação e busca por nome', async () => {
    await request(http).post('/patients').set(auth()).send(base).expect(201);
    await request(http).post('/patients').set(auth()).send({ ...base, name: 'João Pereira', susCardNumber: '999999999999999' }).expect(201);

    const all = await request(http).get('/patients?page=1&limit=10').set(auth()).expect(200);
    expect(all.body.data).toHaveLength(2);
    expect(all.body.total).toBe(2);

    const filtered = await request(http).get('/patients?q=João').set(auth()).expect(200);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].name).toBe('João Pereira');
  });
});
