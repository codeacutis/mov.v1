import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const admin = { name: 'Admin Paginacao', email: 'admin-pag@teste.local', password: 'senha-ficticia-123' };

describe('Paginação e Filtros (e2e)', () => {
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

  it('todos os endpoints de listagem retornam { data, total, page, limit }', async () => {
    for (const path of ['/patients', '/vehicles', '/drivers', '/trips']) {
      const res = await request(http).get(path).set(auth()).expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('retorna lista vazia sem erro quando não há registros', async () => {
    const res = await request(http).get('/patients').set(auth()).expect(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it('pagina corretamente: page/limit/total batem com os registros criados', async () => {
    for (let i = 1; i <= 5; i++) {
      await request(http).post('/patients').set(auth()).send({
        name: `Paciente ${String(i).padStart(2, '0')}`,
        birthDate: '1990-01-01',
      }).expect(201);
    }

    const p1 = await request(http).get('/patients?page=1&limit=2').set(auth()).expect(200);
    expect(p1.body.data).toHaveLength(2);
    expect(p1.body.total).toBe(5);
    expect(p1.body.page).toBe(1);
    expect(p1.body.limit).toBe(2);

    const p2 = await request(http).get('/patients?page=2&limit=2').set(auth()).expect(200);
    expect(p2.body.data).toHaveLength(2);
    expect(p2.body.page).toBe(2);

    const p3 = await request(http).get('/patients?page=3&limit=2').set(auth()).expect(200);
    expect(p3.body.data).toHaveLength(1);

    // Sem sobreposição entre páginas
    const ids1 = p1.body.data.map((p: { id: string }) => p.id);
    const ids2 = p2.body.data.map((p: { id: string }) => p.id);
    expect(ids1.some((id: string) => ids2.includes(id))).toBe(false);
  });

  it('filtra pacientes por nome via parâmetro q', async () => {
    await request(http).post('/patients').set(auth()).send({ name: 'Ana Beatriz', birthDate: '1985-06-20' }).expect(201);
    await request(http).post('/patients').set(auth()).send({ name: 'Carlos Eduardo', birthDate: '1975-11-30' }).expect(201);

    const res = await request(http).get('/patients?q=Ana').set(auth()).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Ana Beatriz');
    expect(res.body.total).toBe(1);
  });

  it('filtra veículos por placa via parâmetro q', async () => {
    await request(http).post('/vehicles').set(auth()).send({ plate: 'AAA1111', capacity: 10 }).expect(201);
    await request(http).post('/vehicles').set(auth()).send({ plate: 'BBB2222', capacity: 8 }).expect(201);

    const res = await request(http).get('/vehicles?q=BBB').set(auth()).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].plate).toBe('BBB2222');
  });

  it('rejeita page=0 e limit=0', async () => {
    await request(http).get('/patients?page=0').set(auth()).expect(400);
    await request(http).get('/patients?limit=0').set(auth()).expect(400);
  });

  it('rejeita limit acima de 100', async () => {
    await request(http).get('/patients?limit=101').set(auth()).expect(400);
  });
});
