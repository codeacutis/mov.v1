import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  PasswordResetNotification,
  PasswordResetNotifier,
} from '../src/auth/password-reset.notifier';
import { sha256Hex } from '../src/auth/password-reset.service';
import { PrismaService } from '../src/prisma/prisma.service';

// Dados 100% fictícios.
const OLD_PASSWORD = 'senha-antiga-ficticia-1';
const NEW_PASSWORD = 'senha-nova-ficticia-22';
const EMAIL = 'maria@teste.local';

describe('Recuperação de senha (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let sent: PasswordResetNotification[];

  const notifier: PasswordResetNotifier = {
    send: (n) => {
      sent.push(n);
      return Promise.resolve();
    },
  };

  const forgot = (email = EMAIL) =>
    request(http).post('/auth/forgot-password').send({ email });
  const reset = (token: string, password = NEW_PASSWORD) =>
    request(http).post('/auth/reset-password').send({ token, password });
  const login = (password: string, email = EMAIL) =>
    request(http).post('/auth/login').send({ email, password });
  /** Solicita e devolve o token em claro capturado no "canal de entrega". */
  const requestToken = async () => {
    await forgot().expect(202);
    await waitFor(() => sent.length > 0);
    return sent[sent.length - 1].token;
  };
  const waitFor = async (cond: () => boolean) => {
    for (let i = 0; i < 50 && !cond(); i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
  };
  /** Zera o anti-flood para testes que pedem tokens em sequência. */
  const clearCooldown = () =>
    prisma.passwordResetToken.updateMany({
      data: { createdAt: new Date(Date.now() - 120_000) },
    });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PasswordResetNotifier)
      .useValue(notifier)
      .compile();
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
    sent = [];
    await prisma.$executeRawUnsafe(
      'TRUNCATE "audit_logs","password_reset_tokens","sessions","users" CASCADE',
    );
    await request(http)
      .post('/auth/bootstrap')
      .send({ name: 'Maria Teste', email: EMAIL, password: OLD_PASSWORD })
      .expect(201);
  });

  it('fluxo completo: solicita, redefine e entra com a nova senha', async () => {
    const token = await requestToken();
    await reset(token).expect(204);
    await login(NEW_PASSWORD).expect(200);
    await login(OLD_PASSWORD).expect(401);
  });

  describe('solicitação', () => {
    it('resposta idêntica para conta existente e inexistente (sem enumeração)', async () => {
      const a = await forgot(EMAIL);
      const b = await forgot('ninguem@teste.local');
      expect(a.status).toBe(202);
      expect(b.status).toBe(202);
      expect(a.body).toEqual(b.body);
      await waitFor(() => sent.length > 0);
      expect(sent).toHaveLength(1);
      expect(sent[0].email).toBe(EMAIL);
    });

    it('guarda somente o hash do token, nunca o valor em claro', async () => {
      const token = await requestToken();
      const rows = await prisma.passwordResetToken.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0].tokenHash).toBe(sha256Hex(token));
      expect(JSON.stringify(rows)).not.toContain(token);
    });

    it('token tem expiração (padrão 30 min)', async () => {
      await requestToken();
      const row = await prisma.passwordResetToken.findFirstOrThrow();
      const ttl = row.expiresAt.getTime() - row.createdAt.getTime();
      expect(ttl).toBeGreaterThan(29 * 60_000);
      expect(ttl).toBeLessThanOrEqual(30 * 60_000 + 1000);
    });

    it('não gera token para usuário inativo', async () => {
      await prisma.user.update({
        where: { email: EMAIL },
        data: { isActive: false },
      });
      await forgot().expect(202);
      expect(await prisma.passwordResetToken.count()).toBe(0);
      expect(sent).toHaveLength(0);
    });

    it('limita solicitações em sequência (anti-flood)', async () => {
      await forgot().expect(202);
      await forgot().expect(202);
      await forgot().expect(202);
      await waitFor(() => sent.length > 0);
      expect(await prisma.passwordResetToken.count()).toBe(1);
      expect(sent).toHaveLength(1);
    });

    it('uma nova solicitação invalida o token anterior', async () => {
      const first = await requestToken();
      await clearCooldown();
      sent = [];
      const second = await requestToken();
      expect(second).not.toBe(first);
      await reset(first).expect(400);
      await reset(second).expect(204);
    });

    it('valida o e-mail', async () => {
      await forgot('nao-e-email').expect(400);
    });
  });

  describe('redefinição', () => {
    it('token de uso único: a segunda tentativa é recusada', async () => {
      const token = await requestToken();
      await reset(token).expect(204);
      const again = await reset(token, 'outra-senha-ficticia-33');
      expect(again.status).toBe(400);
      await login(NEW_PASSWORD).expect(200);
      await login('outra-senha-ficticia-33').expect(401);
    });

    it('usos simultâneos do mesmo token: exatamente um vence', async () => {
      const token = await requestToken();
      const results = await Promise.all(
        [1, 2, 3, 4, 5].map((i) => reset(token, `senha-concorrente-${i}-xx`)),
      );
      expect(results.filter((r) => r.status === 204)).toHaveLength(1);
      expect(results.filter((r) => r.status === 400)).toHaveLength(4);
    });

    it('token expirado é recusado', async () => {
      const token = await requestToken();
      await prisma.passwordResetToken.updateMany({
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await reset(token).expect(400);
      await login(OLD_PASSWORD).expect(200);
    });

    it('token inexistente ou malformado recebe a mesma mensagem genérica', async () => {
      const real = await requestToken();
      await reset(real).expect(204);
      const used = await reset(real);
      const unknown = await reset('A'.repeat(43));
      expect(used.status).toBe(400);
      expect(unknown.status).toBe(400);
      expect(used.body.message).toBe(unknown.body.message);
      await reset('curto').expect(400);
    });

    it('senha fraca é recusada e NÃO consome o token', async () => {
      const token = await requestToken();
      await reset(token, 'curta').expect(400);
      await reset(token).expect(204);
    });

    it('encerra todas as sessões abertas do usuário', async () => {
      const oldToken = (await login(OLD_PASSWORD).expect(200)).body.accessToken;
      await request(http)
        .get('/auth/me')
        .set('Authorization', `Bearer ${oldToken}`)
        .expect(200);
      await reset(await requestToken()).expect(204);
      await request(http)
        .get('/auth/me')
        .set('Authorization', `Bearer ${oldToken}`)
        .expect(401);
    });

    it('armazena a nova senha como hash bcrypt', async () => {
      await reset(await requestToken()).expect(204);
      const row = await prisma.user.findUniqueOrThrow({
        where: { email: EMAIL },
      });
      expect(row.passwordHash).toMatch(/^\$2[aby]\$12\$/);
      expect(row.passwordHash).not.toContain(NEW_PASSWORD);
    });

    it('usuário desativado depois da solicitação não consegue redefinir', async () => {
      const token = await requestToken();
      await prisma.user.update({
        where: { email: EMAIL },
        data: { isActive: false },
      });
      await reset(token).expect(400);
    });
  });

  it('audita solicitação e conclusão sem registrar o token', async () => {
    const token = await requestToken();
    await reset(token).expect(204);
    const logs = await prisma.auditLog.findMany({
      where: { action: { startsWith: 'PASSWORD_RESET' } },
      orderBy: { occurredAt: 'asc' },
    });
    expect(logs.map((l) => l.action)).toEqual([
      'PASSWORD_RESET_REQUESTED',
      'PASSWORD_RESET_COMPLETED',
    ]);
    expect(JSON.stringify(logs)).not.toContain(token);
    expect(JSON.stringify(logs)).not.toContain(NEW_PASSWORD);
  });
});
