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

  it('cancels logically, preserves history and releases patient and companion seats', async () => {
    const created = await request(http).post(`/trips/${tripId}/patient-trips`).set(auth()).send(participation()).expect(201);
    await request(http).post(`/patient-trips/${created.body.id}/companions`).set(auth()).send({ name: 'Companion Test', phone: '11999990000' }).expect(201);
    await request(http).patch(`/patient-trips/${created.body.id}/cancel`).set(auth()).send({ reason: ' ' }).expect(400);
    await request(http).patch(`/patient-trips/${created.body.id}/cancel`).set(auth()).send({ reason: 'Administrative cancellation' }).expect(200);
    const saved = await prisma.patientTrip.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(saved.cancelledAt).toBeTruthy();
    expect(saved.cancelledByUserId).toBeTruthy();
    expect(await prisma.tripCompanion.count({ where: { patientTripId: saved.id } })).toBe(1);
    await request(http).patch(`/patient-trips/${saved.id}`).set(auth()).send({ priority: 'LOW', priorityJustification: 'Test' }).expect(409);
    await request(http).post(`/trips/${tripId}/patient-trips`).set(auth()).send(participation()).expect(409);
    const patient = await request(http).post('/patients').set(auth()).send({ name: 'Other Test Patient', birthDate: '1980-01-01' }).expect(201);
    const second = await request(http).post(`/trips/${tripId}/patient-trips`).set(auth()).send({ ...participation(), patientId: patient.body.id }).expect(201);
    await request(http).post(`/patient-trips/${second.body.id}/companions`).set(auth()).send({ name: 'Other Companion', phone: '11999991111' }).expect(201);
    expect(await prisma.auditLog.count({ where: { action: 'PATIENT_TRIP_CANCELLED', entityId: saved.id } })).toBe(1);
  });

  it('rejects cancellation after departure', async () => {
    const created = await request(http).post(`/trips/${tripId}/patient-trips`).set(auth()).send(participation()).expect(201);
    await request(http).patch(`/trips/${tripId}/start`).set(auth()).expect(200);
    await request(http).patch(`/patient-trips/${created.body.id}/cancel`).set(auth()).send({ reason: 'Test' }).expect(409);
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

  it('rejeita consulta anterior à saída, inclusive no mesmo dia, sem persistir alterações', async () => {
    for (const appointmentAt of ['2099-02-09T10:00:00.000Z', '2099-02-10T05:59:00.000Z']) {
      await request(http).post(`/trips/${tripId}/patient-trips`).set(auth())
        .send({ ...participation(), appointmentAt }).expect(400);
    }
    expect(await prisma.patientTrip.count({ where: { tripId } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: 'PATIENT_TRIP_CREATED' } })).toBe(0);
    const created = await request(http).post(`/trips/${tripId}/patient-trips`).set(auth()).send(participation()).expect(201);
    await request(http).patch(`/patient-trips/${created.body.id}`).set(auth())
      .send({ appointmentAt: '2099-02-10T05:59:00.000Z' }).expect(400);
    const saved = await prisma.patientTrip.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(saved.appointmentAt!.toISOString()).toBe(participation().appointmentAt);
  });

  it('compara instantes com fuso horário e aceita consulta no limite da saída', async () => {
    const created = await request(http).post(`/trips/${tripId}/patient-trips`).set(auth())
      .send({ ...participation(), appointmentAt: '2099-02-10T03:00:00-03:00' }).expect(201);
    expect(created.body.appointmentAt).toBe('2099-02-10T06:00:00.000Z');
    await request(http).patch(`/patient-trips/${created.body.id}`).set(auth())
      .send({ appointmentAt: '2099-02-10T02:59:00-03:00' }).expect(400);
    await request(http).patch(`/patient-trips/${created.body.id}`).set(auth())
      .send({ appointmentAt: '2099-02-10T04:00:00-03:00' }).expect(200);
  });

  it('impede reagendamento que antecipe consultas ativas e preserva as canceladas', async () => {
    const created = await request(http).post(`/trips/${tripId}/patient-trips`).set(auth()).send(participation()).expect(201);
    await request(http).patch(`/trips/${tripId}`).set(auth())
      .send({ plannedDepartureAt: '2099-02-10T11:00:00.000Z' }).expect(400);
    expect((await prisma.trip.findUniqueOrThrow({ where: { id: tripId } })).plannedDepartureAt.toISOString()).toBe('2099-02-10T06:00:00.000Z');
    await request(http).patch(`/patient-trips/${created.body.id}/cancel`).set(auth()).send({ reason: 'Cancelamento fictício' }).expect(200);
    await request(http).patch(`/trips/${tripId}`).set(auth())
      .send({ plannedDepartureAt: '2099-02-10T11:00:00.000Z' }).expect(200);
    expect((await prisma.patientTrip.findUniqueOrThrow({ where: { id: created.body.id } })).appointmentAt!.toISOString()).toBe(participation().appointmentAt);
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

  it('preserva os demais participantes e conta acompanhantes nas vagas', async () => {
    const path = `/trips/${tripId}/patient-trips`;
    const first = await request(http)
      .post(path)
      .set(auth())
      .send(participation())
      .expect(201);
    await request(http)
      .post(`/patient-trips/${first.body.id}/companions`)
      .set(auth())
      .send({ name: 'Acompanhante Teste', phone: '11900000000' })
      .expect(201);
    const patient = await prisma.patient.create({
      data: { name: 'Segundo Paciente', birthDate: new Date('1980-01-01') },
    });
    await request(http)
      .post(path)
      .set(auth())
      .send({ ...participation(), patientId: patient.id })
      .expect(409);
    const companion = await prisma.tripCompanion.findFirstOrThrow({
      where: { patientTripId: first.body.id },
    });
    await request(http)
      .delete(`/patient-trips/${first.body.id}/companions/${companion.id}`)
      .set(auth())
      .expect(204);
    const second = await request(http)
      .post(path)
      .set(auth())
      .send({ ...participation(), patientId: patient.id })
      .expect(201);

    await request(http)
      .patch(`/patient-trips/${first.body.id}`)
      .set(auth())
      .send({
        priority: 'LOW',
        priorityJustification: 'Revisão administrativa',
      })
      .expect(200);
    const statusPath = `/patient-trips/${first.body.id}/return-status`;
    await request(http)
      .patch(statusPath)
      .set(auth())
      .send({ status: 'NO_SHOW' })
      .expect(400);
    await request(http)
      .patch(statusPath)
      .set(auth())
      .send({ status: 'NO_SHOW', reason: 'Paciente ausente no recolhimento' })
      .expect(200);
    const result = await request(http).get(path).set(auth()).expect(200);
    expect(result.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: first.body.id,
          priority: 'LOW',
          returnStatus: 'NO_SHOW',
          returnAbsenceReason: 'Paciente ausente no recolhimento',
        }),
        expect.objectContaining({
          id: second.body.id,
          priority: 'HIGH',
          outboundStatus: 'PLANNED',
          returnStatus: 'EXPECTED',
        }),
      ]),
    );
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
