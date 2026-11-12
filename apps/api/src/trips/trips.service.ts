import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { Prisma, Role, TripStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddPatientDto,
  CompanionDto,
  CreateTripDto,
  ListTripsQueryDto,
  UpdatePatientTripDto,
  UpdateTripDto,
} from './dto/trip.dto';
import {
  ACTIVE_TRIP_STATUSES,
  computeOccupancy,
  detectOverlapViolation,
  fitsCapacity,
  hasValidScheduleOrder,
  OverlapResource,
} from './trip-rules';

const TRIP_ENTITY = 'Trip';
const PATIENT_TRIP_ENTITY = 'PatientTrip';

// Dados do paciente expostos em viagens: nunca CPF, Cartão SUS, endereço ou
// data de nascimento (RN-12, RNF-02). Nome/telefone/indicadores bastam à operação.
const patientSelect = {
  id: true,
  name: true,
  phone: true,
  usesWheelchair: true,
  hasReducedMobility: true,
  needsBoardingAssistance: true,
} satisfies Prisma.PatientSelect;

const companionSelect = {
  id: true,
  name: true,
  phone: true,
  relationship: true,
} satisfies Prisma.TripCompanionSelect;

const tripBaseSelect = {
  id: true,
  status: true,
  municipalPickupPoint: true,
  plannedDepartureAt: true,
  plannedReturnStartAt: true,
  plannedReturnEndAt: true,
  actualDepartureAt: true,
  actualReturnAt: true,
  driver: { select: { id: true, user: { select: { name: true } } } },
  vehicle: {
    select: { id: true, plate: true, description: true, capacity: true },
  },
} satisfies Prisma.TripSelect;

/** Visão ADMIN: inclui prioridade, justificativa e confirmação. */
const adminTripSelect = {
  ...tripBaseSelect,
  cancelledAt: true,
  cancellationReason: true,
  patientTrips: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      appointmentLocationName: true,
      appointmentAddress: true,
      appointmentMunicipality: true,
      appointmentAt: true,
      priority: true,
      priorityJustification: true,
      priorityDefinedAt: true,
      confirmationStatus: true,
      outboundStatus: true,
      returnStatus: true,
      patient: { select: patientSelect },
      companions: { select: companionSelect },
    },
  },
} satisfies Prisma.TripSelect;

/** Visão MOTORISTA: apenas o necessário à execução (RN-12, D-011). */
const driverTripSelect = {
  ...tripBaseSelect,
  patientTrips: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      appointmentLocationName: true,
      appointmentAddress: true,
      appointmentMunicipality: true,
      appointmentAt: true,
      outboundStatus: true,
      returnStatus: true,
      patient: { select: patientSelect },
      companions: { select: companionSelect },
    },
  },
} satisfies Prisma.TripSelect;

type TripRow = Prisma.TripGetPayload<{ select: typeof adminTripSelect }>;

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ------------------------------------------------------------------ leitura

  async list(user: AuthUser, query: ListTripsQueryDto) {
    const where: Prisma.TripWhereInput = {};
    if (user.role === Role.MOTORISTA) where.driver = { userId: user.id };
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.plannedDepartureAt = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      };
    }

    const trips = await this.prisma.trip.findMany({
      where,
      orderBy: { plannedDepartureAt: 'asc' },
      take: query.limit ?? 50,
      skip: query.offset ?? 0,
      select: this.selectFor(user),
    });
    return trips.map((t) => this.present(t as TripRow));
  }

  async get(user: AuthUser, id: string) {
    // MOTORISTA só enxerga viagens atribuídas; as demais respondem 404 para não
    // revelar a existência do recurso.
    const trip = await this.prisma.trip.findFirst({
      where: {
        id,
        ...(user.role === Role.MOTORISTA && { driver: { userId: user.id } }),
      },
      select: this.selectFor(user),
    });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    return this.present(trip as TripRow);
  }

  // ----------------------------------------------------------------- escrita

  async create(actor: AuthUser, dto: CreateTripDto) {
    const times = this.parseTimes(dto);
    this.assertScheduleOrder(times);

    const id = await this.runWriteTx(async (tx) => {
      await this.assertDriverAssignable(tx, dto.driverId);
      await this.assertVehicleAssignable(tx, dto.vehicleId);
      await this.assertNoOverlap(tx, {
        driverId: dto.driverId,
        vehicleId: dto.vehicleId,
        ...times,
      });

      const trip = await tx.trip.create({
        data: {
          driverId: dto.driverId,
          vehicleId: dto.vehicleId,
          municipalPickupPoint: dto.municipalPickupPoint,
          ...times,
        },
        select: { id: true },
      });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        action: 'TRIP_CREATED',
        entityType: TRIP_ENTITY,
        entityId: trip.id,
        changes: {
          driverId: dto.driverId,
          vehicleId: dto.vehicleId,
          plannedDepartureAt: times.plannedDepartureAt.toISOString(),
          plannedReturnStartAt: times.plannedReturnStartAt.toISOString(),
          plannedReturnEndAt: times.plannedReturnEndAt.toISOString(),
        },
      });
      return trip.id;
    });
    return this.get(actor, id);
  }

  /** D-006: somente ADMIN, somente antes do início, com valores antigos/novos na auditoria. */
  async update(actor: AuthUser, id: string, dto: UpdateTripDto) {
    const { reason, ...fields } = dto;
    if (Object.values(fields).every((v) => v === undefined)) {
      throw new BadRequestException('Informe ao menos um campo para alterar');
    }

    await this.runWriteTx(async (tx) => {
      const trip = await this.lockTrip(tx, id);
      this.assertScheduled(trip.status, 'alterar');

      const next = {
        driverId: fields.driverId ?? trip.driverId,
        vehicleId: fields.vehicleId ?? trip.vehicleId,
        municipalPickupPoint:
          fields.municipalPickupPoint ?? trip.municipalPickupPoint,
        plannedDepartureAt: fields.plannedDepartureAt
          ? new Date(fields.plannedDepartureAt)
          : trip.plannedDepartureAt,
        plannedReturnStartAt: fields.plannedReturnStartAt
          ? new Date(fields.plannedReturnStartAt)
          : trip.plannedReturnStartAt,
        plannedReturnEndAt: fields.plannedReturnEndAt
          ? new Date(fields.plannedReturnEndAt)
          : trip.plannedReturnEndAt,
      };
      this.assertScheduleOrder(next);

      if (next.driverId !== trip.driverId) {
        await this.assertDriverAssignable(tx, next.driverId);
      }
      if (next.vehicleId !== trip.vehicleId) {
        const vehicle = await this.assertVehicleAssignable(tx, next.vehicleId);
        const occupied = await this.countOccupancy(tx, id);
        if (!fitsCapacity(vehicle.capacity, occupied, 0)) {
          throw new UnprocessableEntityException(
            `O veículo escolhido (capacidade ${vehicle.capacity}) não comporta os ${occupied} passageiros já alocados`,
          );
        }
      }
      await this.assertNoOverlap(tx, { ...next, excludeTripId: id });

      await tx.trip.update({ where: { id }, data: next });

      const before: Record<string, string> = {};
      const after: Record<string, string> = {};
      for (const key of Object.keys(next) as (keyof typeof next)[]) {
        const oldV = this.scalar(trip[key]);
        const newV = this.scalar(next[key]);
        if (oldV !== newV) {
          before[key] = oldV;
          after[key] = newV;
        }
      }
      if (Object.keys(after).length === 0) return;
      await this.audit.record(tx, {
        actorUserId: actor.id,
        action: 'TRIP_UPDATED',
        entityType: TRIP_ENTITY,
        entityId: id,
        reason,
        changes: { before, after },
      });
    });
    return this.get(actor, id);
  }

  /** RF-22: cancelar somente antes de iniciada, com motivo e auditoria. */
  async cancel(actor: AuthUser, id: string, reason: string) {
    await this.runWriteTx(async (tx) => {
      const trip = await this.lockTrip(tx, id);
      this.assertScheduled(trip.status, 'cancelar');
      await tx.trip.update({
        where: { id },
        data: {
          status: TripStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledByUserId: actor.id,
          cancellationReason: reason,
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        action: 'TRIP_CANCELLED',
        entityType: TRIP_ENTITY,
        entityId: id,
        reason,
        changes: {
          before: { status: trip.status },
          after: { status: 'CANCELLED' },
        },
      });
    });
    return this.get(actor, id);
  }

  async addPatient(actor: AuthUser, tripId: string, dto: AddPatientDto) {
    const companions = dto.companions ?? [];
    await this.runWriteTx(async (tx) => {
      const trip = await this.lockTrip(tx, tripId);
      this.assertScheduled(trip.status, 'incluir pacientes em');

      const patient = await tx.patient.findUnique({
        where: { id: dto.patientId },
        select: { isActive: true },
      });
      if (!patient) throw new NotFoundException('Paciente não encontrado');
      if (!patient.isActive) {
        throw new UnprocessableEntityException('Paciente inativo');
      }

      await this.assertCapacity(
        tx,
        trip.vehicleId,
        tripId,
        1 + companions.length,
      );

      const exists = await tx.patientTrip.findUnique({
        where: { tripId_patientId: { tripId, patientId: dto.patientId } },
        select: { id: true },
      });
      if (exists) {
        throw new ConflictException('Paciente já incluído nesta viagem');
      }

      const now = new Date();
      const created = await tx.patientTrip.create({
        data: {
          tripId,
          patientId: dto.patientId,
          appointmentLocationName: dto.appointmentLocationName,
          appointmentAddress: dto.appointmentAddress,
          appointmentMunicipality: dto.appointmentMunicipality,
          appointmentAt: new Date(dto.appointmentAt),
          priority: dto.priority,
          priorityJustification: dto.priorityJustification,
          priorityDefinedByUserId: actor.id,
          priorityDefinedAt: now,
          companions: { create: companions.map((c) => this.companionData(c)) },
        },
        select: { id: true },
      });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        action: 'PATIENT_ADDED_TO_TRIP',
        entityType: PATIENT_TRIP_ENTITY,
        entityId: created.id,
        // Somente identificadores e prioridade; sem dados pessoais.
        changes: {
          tripId,
          patientId: dto.patientId,
          priority: dto.priority,
          companions: companions.length,
        },
      });
    });
    return this.get(actor, tripId);
  }

  /** D-013: alteração de prioridade exige justificativa e é auditada. */
  async updatePatientTrip(
    actor: AuthUser,
    tripId: string,
    patientTripId: string,
    dto: UpdatePatientTripDto,
  ) {
    const { priority, priorityJustification, appointmentAt, ...rest } = dto;
    if (priority && !priorityJustification) {
      throw new BadRequestException(
        'priorityJustification é obrigatória ao alterar a prioridade',
      );
    }
    if (!priority && priorityJustification) {
      throw new BadRequestException(
        'priorityJustification só pode ser enviada junto de priority',
      );
    }
    if (
      !priority &&
      !appointmentAt &&
      Object.values(rest).every((v) => v === undefined)
    ) {
      throw new BadRequestException('Informe ao menos um campo para alterar');
    }

    await this.runWriteTx(async (tx) => {
      const trip = await this.lockTrip(tx, tripId);
      this.assertScheduled(trip.status, 'alterar participações de');
      const current = await tx.patientTrip.findFirst({
        where: { id: patientTripId, tripId },
      });
      if (!current) throw new NotFoundException('Participação não encontrada');

      const data: Prisma.PatientTripUpdateInput = { ...rest };
      if (appointmentAt) data.appointmentAt = new Date(appointmentAt);
      if (priority) {
        data.priority = priority;
        data.priorityJustification = priorityJustification;
        data.priorityDefinedBy = { connect: { id: actor.id } };
        data.priorityDefinedAt = new Date();
      }
      await tx.patientTrip.update({ where: { id: patientTripId }, data });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        action: priority
          ? 'PATIENT_TRIP_PRIORITY_CHANGED'
          : 'PATIENT_TRIP_UPDATED',
        entityType: PATIENT_TRIP_ENTITY,
        entityId: patientTripId,
        reason: priorityJustification,
        changes: {
          tripId,
          ...(priority && {
            before: { priority: current.priority },
            after: { priority },
          }),
          fieldsChanged: Object.keys({
            ...rest,
            ...(appointmentAt && { appointmentAt }),
          }),
        },
      });
    });
    return this.get(actor, tripId);
  }

  async addCompanion(
    actor: AuthUser,
    tripId: string,
    patientTripId: string,
    dto: CompanionDto,
  ) {
    await this.runWriteTx(async (tx) => {
      const trip = await this.lockTrip(tx, tripId);
      this.assertScheduled(trip.status, 'incluir acompanhantes em');
      const pt = await tx.patientTrip.findFirst({
        where: { id: patientTripId, tripId },
        select: { id: true },
      });
      if (!pt) throw new NotFoundException('Participação não encontrada');

      await this.assertCapacity(tx, trip.vehicleId, tripId, 1);
      const companion = await tx.tripCompanion.create({
        data: { patientTripId, ...this.companionData(dto) },
        select: { id: true },
      });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        action: 'COMPANION_ADDED',
        entityType: PATIENT_TRIP_ENTITY,
        entityId: patientTripId,
        changes: { tripId, companionId: companion.id },
      });
    });
    return this.get(actor, tripId);
  }

  async removeCompanion(
    actor: AuthUser,
    tripId: string,
    patientTripId: string,
    companionId: string,
  ) {
    await this.runWriteTx(async (tx) => {
      const trip = await this.lockTrip(tx, tripId);
      this.assertScheduled(trip.status, 'remover acompanhantes de');
      const companion = await tx.tripCompanion.findFirst({
        where: { id: companionId, patientTripId, patientTrip: { tripId } },
        select: { id: true },
      });
      if (!companion)
        throw new NotFoundException('Acompanhante não encontrado');

      await tx.tripCompanion.delete({ where: { id: companionId } });
      await this.audit.record(tx, {
        actorUserId: actor.id,
        action: 'COMPANION_REMOVED',
        entityType: PATIENT_TRIP_ENTITY,
        entityId: patientTripId,
        changes: { tripId, companionId },
      });
    });
    return this.get(actor, tripId);
  }

  // ---------------------------------------------------------------- internos

  private selectFor(user: AuthUser) {
    return user.role === Role.ADMIN ? adminTripSelect : driverTripSelect;
  }

  private present(trip: TripRow) {
    const occupied = computeOccupancy(
      trip.patientTrips.length,
      trip.patientTrips.reduce((n, pt) => n + pt.companions.length, 0),
    );
    return { ...trip, occupiedSeats: occupied };
  }

  private parseTimes(dto: {
    plannedDepartureAt: string;
    plannedReturnStartAt: string;
    plannedReturnEndAt: string;
  }) {
    return {
      plannedDepartureAt: new Date(dto.plannedDepartureAt),
      plannedReturnStartAt: new Date(dto.plannedReturnStartAt),
      plannedReturnEndAt: new Date(dto.plannedReturnEndAt),
    };
  }

  private assertScheduleOrder(times: {
    plannedDepartureAt: Date;
    plannedReturnStartAt: Date;
    plannedReturnEndAt: Date;
  }) {
    const values = [
      times.plannedDepartureAt,
      times.plannedReturnStartAt,
      times.plannedReturnEndAt,
    ];
    if (values.some((d) => Number.isNaN(d.getTime()))) {
      throw new BadRequestException('Data/hora inválida');
    }
    if (!hasValidScheduleOrder(times)) {
      throw new UnprocessableEntityException(
        'A saída deve ser anterior ao início do retorno, e este anterior ao fim do retorno',
      );
    }
  }

  private assertScheduled(status: TripStatus, verb: string) {
    if (status !== TripStatus.SCHEDULED) {
      throw new ConflictException(
        `Só é possível ${verb} uma viagem com status SCHEDULED (atual: ${status})`,
      );
    }
  }

  private async assertDriverAssignable(
    tx: Prisma.TransactionClient,
    driverId: string,
  ) {
    const driver = await tx.driver.findUnique({
      where: { id: driverId },
      select: { isActive: true, user: { select: { isActive: true } } },
    });
    if (!driver) throw new NotFoundException('Motorista não encontrado');
    if (!driver.isActive || !driver.user.isActive) {
      throw new UnprocessableEntityException('Motorista inativo');
    }
  }

  /** RN-17: veículo inativo ou em manutenção não pode ser alocado. */
  private async assertVehicleAssignable(
    tx: Prisma.TransactionClient,
    vehicleId: string,
  ) {
    const vehicle = await tx.vehicle.findUnique({
      where: { id: vehicleId },
      select: { status: true, capacity: true },
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');
    if (vehicle.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        `Veículo indisponível para alocação (status: ${vehicle.status})`,
      );
    }
    return vehicle;
  }

  /**
   * Verificação amigável de conflito (mensagem clara). A garantia real contra
   * concorrência é a constraint de exclusão do PostgreSQL (ver migration).
   */
  private async assertNoOverlap(
    tx: Prisma.TransactionClient,
    p: {
      driverId: string;
      vehicleId: string;
      plannedDepartureAt: Date;
      plannedReturnEndAt: Date;
      excludeTripId?: string;
    },
  ) {
    const overlapping = {
      status: { in: [...ACTIVE_TRIP_STATUSES] },
      plannedDepartureAt: { lt: p.plannedReturnEndAt },
      plannedReturnEndAt: { gt: p.plannedDepartureAt },
      ...(p.excludeTripId && { id: { not: p.excludeTripId } }),
    };
    const [byDriver, byVehicle] = await Promise.all([
      tx.trip.findFirst({
        where: { driverId: p.driverId, ...overlapping },
        select: { id: true },
      }),
      tx.trip.findFirst({
        where: { vehicleId: p.vehicleId, ...overlapping },
        select: { id: true },
      }),
    ]);
    if (byDriver) this.throwOverlap('DRIVER');
    if (byVehicle) this.throwOverlap('VEHICLE');
  }

  private throwOverlap(resource: OverlapResource): never {
    throw new ConflictException(
      resource === 'DRIVER'
        ? 'Conflito de agenda: o motorista já possui viagem neste intervalo'
        : 'Conflito de agenda: o veículo já possui viagem neste intervalo',
    );
  }

  private async countOccupancy(tx: Prisma.TransactionClient, tripId: string) {
    const [patients, companions] = await Promise.all([
      tx.patientTrip.count({ where: { tripId } }),
      tx.tripCompanion.count({ where: { patientTrip: { tripId } } }),
    ]);
    return computeOccupancy(patients, companions);
  }

  /** RF-09/RN-11. Chamado com a viagem travada (FOR UPDATE), logo sem corrida. */
  private async assertCapacity(
    tx: Prisma.TransactionClient,
    vehicleId: string,
    tripId: string,
    adding: number,
  ) {
    const vehicle = await tx.vehicle.findUniqueOrThrow({
      where: { id: vehicleId },
      select: { capacity: true },
    });
    const occupied = await this.countOccupancy(tx, tripId);
    if (!fitsCapacity(vehicle.capacity, occupied, adding)) {
      throw new UnprocessableEntityException(
        `Capacidade excedida: veículo comporta ${vehicle.capacity} passageiros, ${occupied} já alocados e ${adding} a incluir`,
      );
    }
  }

  /**
   * Trava a linha da viagem até o fim da transação, serializando alterações
   * concorrentes (capacidade, status, horários) sobre a mesma viagem.
   */
  private async lockTrip(tx: Prisma.TransactionClient, id: string) {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "trips" WHERE "id" = ${id}::uuid FOR UPDATE`;
    if (rows.length === 0) throw new NotFoundException('Viagem não encontrada');
    return tx.trip.findUniqueOrThrow({ where: { id } });
  }

  private companionData(c: CompanionDto) {
    return { name: c.name, phone: c.phone, relationship: c.relationship };
  }

  private scalar(v: unknown): string {
    return v instanceof Date ? v.toISOString() : String(v);
  }

  /** Executa a transação convertendo violação da constraint de agenda em 409. */
  private async runWriteTx<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(fn);
    } catch (err) {
      const resource = detectOverlapViolation(err);
      if (resource) this.throwOverlap(resource);
      throw err;
    }
  }
}
