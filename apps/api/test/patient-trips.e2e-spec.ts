import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Participações de pacientes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let token: string;
  let tripId: string;
  let patientId: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const participation = () => ({
    patientId,
    appointmentLocationName: 'Hospital Regional',
    appointmentAddress: 'Rua Fictícia, 100',
    appointmentMunicipality: 'Cidade Teste',
    appointmentAt: '2099-02-10T10:00:00.000Z',
    priority: 'HIGH',
    priorityJustification: 'Prioridade administrativa de teste',
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
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
    const admin = {
      name: 'Admin Participações',
      email: 'admin-patient-trip@teste.local',
      password: 'senha-ficticia-123',
    };
    await request(http).post('/auth/bootstrap').send(admin).expect(201);
    const login = await request(http)
      .post('/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(200);
    token = login.body.accessToken as string;
    const vehicle = await request(http)
      .post('/vehicles')
      .set(auth())
      .send({ plate: 'PTT0001', capacity: 2 })
      .expect(201);
    const driver = await request(http)
      .post('/drivers')
      .set(auth())
      .send({
        name: 'Motorista Participações',
        email: 'driver-pt@teste.local',
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
        municipalPickupPoint: 'Terminal',
        plannedDepartureAt: '2099-02-10T06:00:00.000Z',
        plannedReturnStartAt: '2099-02-10T16:00:00.000Z',
      })
      .expect(201);
    tripId = trip.body.id as string;
    const patient = await request(http)
      .post('/patients')
      .set(auth())
      .send({ name: 'Paciente Fictício', birthDate: '1980-01-01' })
      .expect(201);
    patientId = patient.body.id as string;
  });

  it('associa o paciente com prioridade, consulta e estados iniciais próprios', async () => {
    const created = await request(http)
      .post(`/trips/${tripId}/patient-trips`)
      .set(auth())
      .send(participation())
      .expect(201);
    expect(created.body).toMatchObject({
      patientId,
      priority: 'HIGH',
      confirmationStatus: 'PENDING',
      outboundStatus: 'PLANNED',
      returnStatus: 'EXPECTED',
    });
    expect(created.body.priorityDefinedAt).toBeTruthy();
    const audits = await prisma.auditLog.findMany({
      where: { entityId: created.body.id },
    });
    expect(audits.map((item) => item.action)).toContain('PATIENT_TRIP_CREATED');
  });

  it('impede o mesmo paciente duas vezes na viagem', async () => {
    await request(http)
      .post(`/trips/${tripId}/patient-trips`)
      .set(auth())
      .send(participation())
      .expect(201);
    await request(http)
      .post(`/trips/${tripId}/patient-trips`)
      .set(auth())
      .send(participation())
      .expect(409);
  });

  it('mantém ida independente e exige motivo ao registrar NOT_RETURNING', async () => {
    const created = await request(http)
      .post(`/trips/${tripId}/patient-trips`)
      .set(auth())
      .send(participation())
      .expect(201);
    await request(http)
      .patch(`/patient-trips/${created.body.id}/outbound-status`)
      .set(auth())
      .send({ status: 'BOARDED' })
      .expect(200);
    await request(http)
      .patch(`/patient-trips/${created.body.id}/return-status`)
      .set(auth())
      .send({ status: 'NOT_RETURNING' })
      .expect(400);
    const updated = await request(http)
      .patch(`/patient-trips/${created.body.id}/return-status`)
      .set(auth())
      .send({ status: 'NOT_RETURNING', reason: 'Retorno por meio próprio' })
      .expect(200);
    expect(updated.body).toMatchObject({
      outboundStatus: 'BOARDED',
      returnStatus: 'NOT_RETURNING',
      returnAbsenceReason: 'Retorno por meio próprio',
    });
    expect(updated.body.returnAbsenceReportedAt).toBeTruthy();
    expect(updated.body.returnAbsenceReportedBy).toBeTruthy();
  });

  it('rejeita prioridade inválida e alteração sem justificativa', async () => {
    await request(http)
      .post(`/trips/${tripId}/patient-trips`)
      .set(auth())
      .send({ ...participation(), priority: 'URGENT' })
      .expect(400);
    const created = await request(http)
      .post(`/trips/${tripId}/patient-trips`)
      .set(auth())
      .send(participation())
      .expect(201);
    await request(http)
      .patch(`/patient-trips/${created.body.id}`)
      .set(auth())
      .send({ priority: 'LOW' })
      .expect(400);
  });
});
