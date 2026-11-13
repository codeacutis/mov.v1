import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Dados 100% fictícios.
const PASSWORD = 'senha-ficticia-123';
const admin = {
  name: 'Admin Teste',
  email: 'admin@teste.local',
  password: PASSWORD,
};
const motorista = {
  name: 'Motorista Teste',
  email: 'motorista@teste.local',
  password: PASSWORD,
  role: 'MOTORISTA',
};

describe('Autenticação (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<INestApplication['getHttpServer']>;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const bootstrap = () => request(http).post('/auth/bootstrap').send(admin);
  const login = (email: string, password = PASSWORD) =>
    request(http).post('/auth/login').send({ email, password });
  const tokenOf = async (email: string) =>
    (await login(email).expect(200)).body.accessToken as string;
  const setupAdminAndDriver = async () => {
    await bootstrap().expect(201);
    const adminToken = await tokenOf(admin.email);
    await request(http)
      .post('/users')
      .set(auth(adminToken))
      .send(motorista)
      .expect(201);
    return { adminToken, driverToken: await tokenOf(motorista.email) };
  };

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
      'TRUNCATE "audit_logs","sessions","users" CASCADE',
    );
  });

  it('fluxo de aceite: cadastra, entra, acessa rota protegida e sai', async () => {
    const created = await bootstrap().expect(201);
    expect(created.body).toMatchObject({ email: admin.email, role: 'ADMIN' });

    const token = await tokenOf(admin.email);
    const me = await request(http).get('/auth/me').set(auth(token)).expect(200);
    expect(me.body).toMatchObject({ name: admin.name, role: 'ADMIN' });

    await request(http).post('/auth/logout').set(auth(token)).expect(204);
    await request(http).get('/auth/me').set(auth(token)).expect(401);
  });

  describe('cadastro', () => {
    it('armazena a senha como hash bcrypt e nunca a devolve', async () => {
      const res = await bootstrap().expect(201);
      expect(JSON.stringify(res.body)).not.toMatch(
        /password|hash|senha-ficticia/i,
      );
      const row = await prisma.user.findUniqueOrThrow({
        where: { email: admin.email },
      });
      expect(row.passwordHash).not.toContain(PASSWORD);
      expect(row.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    });

    it('bootstrap só funciona uma vez', async () => {
      await bootstrap().expect(201);
      await request(http)
        .post('/auth/bootstrap')
        .send({ ...admin, email: 'outro@teste.local' })
        .expect(403);
      expect(await prisma.user.count()).toBe(1);
    });

    it('bootstrap simultâneo cria um único administrador', async () => {
      const results = await Promise.all(
        [1, 2, 3, 4].map((i) =>
          request(http)
            .post('/auth/bootstrap')
            .send({ ...admin, email: `admin${i}@teste.local` }),
        ),
      );
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(results.filter((r) => r.status === 403)).toHaveLength(3);
      expect(await prisma.user.count()).toBe(1);
    });

    it('somente ADMIN cadastra usuários; MOTORISTA recebe 403 e anônimo 401', async () => {
      const { driverToken } = await setupAdminAndDriver();
      const body = { ...motorista, email: 'novo@teste.local' };
      await request(http).post('/users').send(body).expect(401);
      await request(http)
        .post('/users')
        .set(auth(driverToken))
        .send(body)
        .expect(403);
    });

    it('rejeita e-mail duplicado (mesmo com caixa diferente), senha curta e campos extras', async () => {
      const { adminToken } = await setupAdminAndDriver();
      const post = (b: object) =>
        request(http).post('/users').set(auth(adminToken)).send(b);
      await post({ ...motorista, email: 'MOTORISTA@teste.local' }).expect(409);
      await post({
        ...motorista,
        email: 'a@teste.local',
        password: 'curta',
      }).expect(400);
      await post({
        ...motorista,
        email: 'b@teste.local',
        isActive: false,
      }).expect(400);
      await post({
        ...motorista,
        email: 'c@teste.local',
        role: 'SUPERUSER',
      }).expect(400);
    });

    it('audita o cadastro sem registrar dados pessoais', async () => {
      const { adminToken } = await setupAdminAndDriver();
      const log = await prisma.auditLog.findFirstOrThrow({
        where: { action: 'USER_CREATED' },
      });
      expect(log.changes).toEqual({ role: 'MOTORISTA' });
      expect(JSON.stringify(log)).not.toContain(motorista.email);
      expect(adminToken).toBeDefined();
    });
  });

  describe('login', () => {
    it('rejeita senha errada e e-mail inexistente com a mesma resposta', async () => {
      await bootstrap().expect(201);
      const a = await login(admin.email, 'senha-errada-123');
      const b = await login('nao@existe.local');
      expect([a.status, b.status]).toEqual([401, 401]);
      expect(a.body.message).toBe(b.body.message);
    });

    it('aceita e-mail com caixa/espaços diferentes', async () => {
      await bootstrap().expect(201);
      await login('  ADMIN@Teste.Local ').expect(200);
    });

    it('usuário desativado não entra e perde o acesso imediatamente', async () => {
      const { driverToken } = await setupAdminAndDriver();
      await prisma.user.update({
        where: { email: motorista.email },
        data: { isActive: false },
      });
      await request(http).get('/auth/me').set(auth(driverToken)).expect(401);
      await login(motorista.email).expect(401);
    });
  });

  describe('sessão e proteção de rotas', () => {
    it('rotas protegidas exigem token válido', async () => {
      await request(http).get('/auth/me').expect(401);
      await request(http).get('/auth/me').set(auth('lixo')).expect(401);
      await request(http).post('/auth/logout').expect(401);
    });

    it('logout revoga só a sessão atual; outras sessões continuam válidas', async () => {
      await bootstrap().expect(201);
      const t1 = await tokenOf(admin.email);
      const t2 = await tokenOf(admin.email);
      await request(http).post('/auth/logout').set(auth(t1)).expect(204);
      await request(http).get('/auth/me').set(auth(t1)).expect(401);
      await request(http).get('/auth/me').set(auth(t2)).expect(200);
      expect(
        await prisma.session.count({ where: { revokedAt: { not: null } } }),
      ).toBe(1);
    });

    it('token reutilizado após logout não faz logout duplo nem erro', async () => {
      await bootstrap().expect(201);
      const t = await tokenOf(admin.email);
      await request(http).post('/auth/logout').set(auth(t)).expect(204);
      await request(http).post('/auth/logout').set(auth(t)).expect(401);
    });

    it('sessão expirada no banco invalida o token mesmo com JWT ainda válido', async () => {
      await bootstrap().expect(201);
      const t = await tokenOf(admin.email);
      await prisma.session.updateMany({
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await request(http).get('/auth/me').set(auth(t)).expect(401);
    });

    it('token assinado com outro segredo é recusado', async () => {
      await bootstrap().expect(201);
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: admin.email },
      });
      const session = await prisma.session.create({
        data: { userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
      });
      const forged = await new JwtService({
        secret: 'outro-segredo-qualquer-com-32-caracteres!!',
      }).signAsync({ sub: user.id, sid: session.id });
      await request(http).get('/auth/me').set(auth(forged)).expect(401);
    });

    it('o papel vem do banco, não do token', async () => {
      const { driverToken } = await setupAdminAndDriver();
      await request(http).get('/auth/me').set(auth(driverToken)).expect(200);
      await prisma.user.update({
        where: { email: motorista.email },
        data: { role: 'ADMIN' },
      });
      const me = await request(http)
        .get('/auth/me')
        .set(auth(driverToken))
        .expect(200);
      expect(me.body.role).toBe('ADMIN');
    });
  });
});
