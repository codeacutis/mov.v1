import { INestApplication, Type, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ResponseObject,
  SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import * as request from 'supertest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateDriverDto } from '../drivers/dto/driver.dto';
import { UpdatePatientDto } from '../patients/dto/patient.dto';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { PasswordResetService } from '../auth/password-reset.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { DriversController } from '../drivers/drivers.controller';
import { DriversService } from '../drivers/drivers.service';
import { PatientsController } from '../patients/patients.controller';
import { PatientsService } from '../patients/patients.service';
import { VehiclesController } from '../vehicles/vehicles.controller';
import { VehiclesService } from '../vehicles/vehicles.service';
import { TripsController } from '../trips/trips.controller';
import { TripsService } from '../trips/trips.service';
import { PatientTripsController } from '../trips/patient-trips.controller';
import { PatientTripsService } from '../trips/patient-trips.service';
import { CompanionsController } from '../trips/companions.controller';
import { CompanionsService } from '../trips/companions.service';
import { TripStopsController } from '../trips/trip-stops.controller';
import { TripStopsService } from '../trips/trip-stops.service';
import { DriverTripsController } from '../driver-trips/driver-trips.controller';
import { DriverTripsService } from '../driver-trips/driver-trips.service';
import { AnalyticsController } from '../trips/analytics.controller';
import { AnalyticsService } from '../trips/analytics.service';
import { ReportsController } from '../trips/reports.controller';
import { ReportsService } from '../trips/reports.service';
import { AuditController } from '../audit/audit.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ApiExceptionFilter } from '../common/api-exception.filter';
import { createApiDocument, setupSwagger, swaggerEnabled } from './swagger';

// Documentação/HTTP sem banco: controllers, DTOs e guards reais, persistência simulada.
const controllers = [
  AppController,
  AuthController,
  UsersController,
  DriversController,
  PatientsController,
  VehiclesController,
  TripsController,
  PatientTripsController,
  CompanionsController,
  TripStopsController,
  DriverTripsController,
  AnalyticsController,
  ReportsController,
  AuditController,
];
const services: Type<unknown>[] = [
  AppService,
  UsersService,
  DriversService,
  PatientsService,
  VehiclesService,
  TripsService,
  PatientTripsService,
  CompanionsService,
  TripStopsService,
  DriverTripsService,
  AnalyticsService,
  ReportsService,
  PasswordResetService,
];

describe('Swagger e contratos públicos', () => {
  let app: INestApplication;
  let disabled: INestApplication;
  let document: ReturnType<typeof createApiDocument>;
  const jwt = new JwtService({
    secret: 'fictional-swagger-test-secret-only-000000',
  });
  const id = '00000000-0000-4000-8000-000000000001';
  const session = {
    userId: id,
    expiresAt: new Date('2099-01-01'),
    revokedAt: null,
    user: { id, name: 'Administrador fictício', role: 'ADMIN', isActive: true },
  };

  async function makeApp(enabled: boolean) {
    const mod = await Test.createTestingModule({
      controllers,
      providers: [
        ...services.map((provide) => ({ provide, useValue: {} })),
        { provide: ConfigService, useValue: { get: () => 'test' } },
        { provide: JwtService, useValue: jwt },
        {
          provide: PrismaService,
          useValue: {
            session: { findUnique: jest.fn().mockResolvedValue(session) },
          },
        },
        {
          provide: AuthService,
          useValue: {
            login: async () => ({
              accessToken: jwt.sign({ sub: id, sid: id }),
              expiresAt: session.expiresAt,
            }),
          },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    const instance = mod.createNestApplication();
    instance.useGlobalFilters(new ApiExceptionFilter());
    instance.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    setupSwagger(instance, {
      NODE_ENV: 'production',
      SWAGGER_ENABLED: String(enabled),
    });
    await instance.init();
    return instance;
  }

  beforeAll(async () => {
    app = await makeApp(true);
    disabled = await makeApp(false);
    document = createApiDocument(app);
  });
  afterAll(async () => {
    await app?.close();
    await disabled?.close();
  });

  it('habilita explicitamente em produção e recusa configuração inválida', () => {
    expect(swaggerEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(swaggerEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(swaggerEnabled({ SWAGGER_ENABLED: 'false' })).toBe(false);
    expect(
      swaggerEnabled({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' }),
    ).toBe(true);
    expect(() => swaggerEnabled({ SWAGGER_ENABLED: 'yes' })).toThrow(
      'SWAGGER_ENABLED',
    );
  });

  it('serve UI, recursos estáticos e contrato JSON quando habilitado', async () => {
    await request(app.getHttpServer())
      .get('/api/docs')
      .expect(200)
      .expect(/swagger-ui/);
    await request(app.getHttpServer())
      .get('/api/docs/swagger-ui-init.js')
      .expect(200)
      .expect(/persistAuthorization/);
    const result = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    expect(result.body.info).toMatchObject({ title: 'Mov+', version: '1.0' });
    expect(result.body.components.securitySchemes.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
    await request(app.getHttpServer()).get('/api/docs-yaml').expect(200);
  });

  it('não registra UI nem contratos quando desabilitado', async () => {
    for (const url of [
      '/api/docs',
      '/api/docs-json',
      '/api/docs-yaml',
      '/api/docs/swagger-ui-init.js',
    ]) {
      await request(disabled.getHttpServer()).get(url).expect(404);
    }
  });

  it('documenta todas as operações com tags, sucesso, erros e política Bearer', () => {
    const methods = ['get', 'post', 'patch', 'delete'];
    const tags = new Set<string>();
    let count = 0;
    for (const [url, path] of Object.entries(document.paths)) {
      for (const verb of methods) {
        const op = path[verb];
        if (!op) continue;
        count++;
        expect(op.summary).toBeTruthy();
        expect(op.tags).toHaveLength(1);
        tags.add(op.tags[0]);
        expect(
          Object.keys(op.responses).some((code) => code.startsWith('2')),
        ).toBe(true);
        expect(op.responses['400']).toBeDefined();
        const isPublic =
          url === '/' ||
          [
            '/auth/bootstrap',
            '/auth/login',
            '/auth/forgot-password',
            '/auth/reset-password',
          ].includes(url);
        if (isPublic) expect(op.security ?? []).toHaveLength(0);
        else {
          expect(op.security).toContainEqual({ bearer: [] });
          expect(op.responses['401']).toBeDefined();
          expect(op.responses['403']).toBeDefined();
        }
      }
    }
    expect(count).toBeGreaterThan(55);
    expect(tags).toEqual(
      new Set([
        'Serviço',
        'Autenticação',
        'Usuários',
        'Motoristas',
        'Pacientes',
        'Veículos',
        'Viagens',
        'Participações',
        'Acompanhantes',
        'Paradas',
        'Operações do motorista',
        'Dashboard',
        'Relatórios',
        'Auditoria',
      ]),
    );
  });

  it('representa paginação, filtros, parâmetros UUID, enums e DTOs parciais', () => {
    const patients = document.paths['/patients'].get;
    expect(patients.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'page',
          required: false,
          schema: expect.objectContaining({ minimum: 1, default: 1 }),
        }),
        expect.objectContaining({
          name: 'limit',
          schema: expect.objectContaining({ maximum: 100, default: 20 }),
        }),
      ]),
    );
    expect(document.paths['/reports/trips'].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'start', required: true }),
        expect.objectContaining({ name: 'driverId', required: false }),
        expect.objectContaining({ name: 'status', required: false }),
      ]),
    );
    expect(document.paths['/driver/trips/{id}'].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'id',
          in: 'path',
          schema: expect.objectContaining({ format: 'uuid' }),
        }),
      ]),
    );
    const schemas = document.components.schemas as Record<string, SchemaObject>;
    expect(schemas.CreatePatientDto.required).toEqual(['name', 'birthDate']);
    expect(schemas.UpdatePatientDto.required ?? []).toEqual([]);
    expect(schemas.UpdateDriverDto.properties).toHaveProperty('email');
    expect(schemas.CreatePatientTripDto.required).toContain(
      'priorityJustification',
    );
    expect(schemas.UpdateOutboundStatusDto.properties.status).toHaveProperty(
      'enum',
      ['PLANNED', 'BOARDED', 'NO_SHOW'],
    );
    expect(schemas.DriverReturnStatusDto.properties).toHaveProperty('reason');
    expect(schemas.DriverReturnStatusDto.properties).toHaveProperty(
      'contactAttempt',
    );
    expect(schemas.LoginDto.properties.password).toHaveProperty(
      'writeOnly',
      true,
    );
  });

  it('declara os status reais e Excel binário; todos os $refs são resolvidos', () => {
    expect(document.paths['/auth/login'].post.responses).toHaveProperty('200');
    expect(
      document.paths['/auth/forgot-password'].post.responses,
    ).toHaveProperty('202');
    expect(
      document.paths['/auth/reset-password'].post.responses['204'],
    ).not.toHaveProperty('content');
    expect(
      document.paths['/driver/trips/{id}/start'].patch.responses['204'],
    ).not.toHaveProperty('content');
    expect(
      (
        document.paths['/reports/trips.xlsx'].get.responses[
          '200'
        ] as ResponseObject
      ).content[
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ].schema,
    ).toEqual({ type: 'string', format: 'binary' });
    const json = JSON.stringify(document);
    for (const match of json.matchAll(
      /"\$ref":"#\/components\/schemas\/([^"/]+)"/g,
    )) {
      expect(document.components.schemas[match[1]]).toBeDefined();
    }
    expect(Object.keys(document.components.schemas)).not.toContain('Session');
    expect(json).not.toContain('passwordHash');
    expect(json).not.toContain('DATABASE_URL');
    const driverDetail = JSON.stringify(
      document.components.schemas.DriverTripDetail,
    );
    for (const field of [
      'cpf',
      'susCardNumber',
      'birthDate',
      'operationalNotes',
      'relationship',
      'priorityJustification',
    ])
      expect(driverDetail).not.toContain(field);
  });

  it('mantém autenticação, autorização e validação com Swagger habilitado', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    const result = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.test', password: 'senha-ficticia-123' })
      .expect(200);
    const bearer = `Bearer ${result.body.accessToken}`;
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', bearer)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({ id, name: session.user.name, role: 'ADMIN' }),
      );
    await request(app.getHttpServer())
      .get('/driver/trips')
      .set('Authorization', bearer)
      .expect(403);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'inválido', password: '' })
      .expect(400);
  });

  it('preserva a validação dos DTOs parciais com metadados Swagger', async () => {
    expect(
      await validate(
        plainToInstance(UpdateDriverDto, { name: 'Motorista fictício' }),
      ),
    ).toEqual([]);
    expect(
      await validate(
        plainToInstance(UpdatePatientDto, { phone: '00000000000' }),
      ),
    ).toEqual([]);
    const errors = await validate(
      plainToInstance(UpdateDriverDto, { password: 'curta' }),
    );
    expect(errors.map((error) => error.property)).toContain('password');
  });
});
