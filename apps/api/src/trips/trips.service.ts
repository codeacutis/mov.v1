import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import {
  lockOperationalIntegrity,
  tripOccupancy,
} from '../common/operational-integrity';
import { Prisma, TripStatus, VehicleStatus, TripObservationType } from '../generated/prisma/client';
import { findOperationalTrip } from './driver-operation-scope';
import { PrismaService } from '../prisma/prisma.service';
import { CorrectActualTimesDto } from './dto/correct-actual-times.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { InterruptTripDto, UpdateTripDto } from './dto/update-trip.dto';
import { assertRouteEditable, assertRouteComplete } from './route-integrity';
import { TripListQueryDto } from './dto/trip-list-query.dto';

const tripSelect = {
  id: true,
  municipalPickupPoint: true,
  plannedDepartureAt: true,
  plannedReturnStartAt: true,
  actualDepartureAt: true,
  actualReturnStartAt: true,
  actualReturnAt: true,
  status: true,
  cancellationReason: true,
  cancelledAt: true,
  interruptionReason: true,
  interruptedAt: true,
  interruptionAction: true,
  routeApprovedAt: true,
  createdAt: true,
  vehicle: { select: { id: true, plate: true, description: true, capacity: true } },
  driver: { select: { id: true, user: { select: { id: true, name: true } } } },
  _count: { select: { patientTrips: { where: { cancelledAt: null } } } },
} satisfies Prisma.TripSelect;

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(q?: string, page = 1, limit = 20, filters: Pick<TripListQueryDto, 'status' | 'vehicleId' | 'driverId'> = {}) {
    const where: Prisma.TripWhereInput = q
      ? {
          OR: [
            { municipalPickupPoint: { contains: q, mode: 'insensitive' } },
            { vehicle: { plate: { contains: q, mode: 'insensitive' } } },
            { vehicle: { description: { contains: q, mode: 'insensitive' } } },
            {
              driver: { user: { name: { contains: q, mode: 'insensitive' } } },
            },
          ],
        }
      : {};
    if (filters.status) where.status = filters.status;
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.driverId) where.driverId = filters.driverId;
    const [data, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        select: tripSelect,
        orderBy: { plannedDepartureAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.trip.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async get(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      select: tripSelect,
    });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    return trip;
  }

  async listObservations(id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id }, select: { id: true } });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    return this.prisma.tripObservation.findMany({ where: { tripId: id }, select: { id: true, type: true, description: true, patientTripId: true, createdAt: true, author: { select: { id: true, name: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
  }

  async correctActualTimes(actorUserId: string, id: string, dto: CorrectActualTimesDto) {
    const fields = ['actualDepartureAt', 'actualReturnStartAt', 'actualReturnAt'] as const;
    const supplied = fields.filter(field => dto[field] !== undefined);
    if (!dto.reason?.trim() || !supplied.length || supplied.some(field => typeof dto[field] !== 'string')) throw new BadRequestException('Informe ao menos um horário válido.');
    return this.prisma.$transaction(async tx => {
      await lockOperationalIntegrity(tx);
      const trip = await tx.trip.findUnique({ where: { id } });
      if (!trip) throw new NotFoundException('Viagem não encontrada');
      if (supplied.some(field => !trip[field])) throw new ConflictException('Somente horários reais já registrados podem ser corrigidos.');
      const next = { actualDepartureAt: trip.actualDepartureAt, actualReturnStartAt: trip.actualReturnStartAt, actualReturnAt: trip.actualReturnAt };
      for (const field of supplied) next[field] = new Date(dto[field]!);
      if (fields.some(field => next[field] && (isNaN(next[field]!.getTime()) || next[field]!.getTime() > Date.now()))) throw new BadRequestException('Informe horários válidos que não estejam no futuro.');
      const ordered = fields.map(field => next[field]).filter((v): v is Date => v !== null);
      if (ordered.some((value, index) => index > 0 && value < ordered[index - 1])) throw new BadRequestException('Os horários devem respeitar a ordem da viagem.');
      const changed = supplied.filter(field => trip[field]!.getTime() !== next[field]!.getTime());
      if (!changed.length) throw new BadRequestException('Informe uma alteração de horário.');
      const before: Record<string, string> = {}, after: Record<string, string> = {};
      for (const field of changed) { before[field] = trip[field]!.toISOString(); after[field] = next[field]!.toISOString(); }
      const updated = await tx.trip.update({ where: { id }, data: Object.fromEntries(changed.map(field => [field, next[field]])), select: tripSelect });
      await this.audit.record(tx, { actorUserId, action: 'TRIP_ACTUAL_TIMES_CORRECTED', entityType: 'Trip', entityId: id, reason: dto.reason.trim(), changes: { before, after } });
      return updated;
    });
  }

  async create(actorUserId: string, dto: CreateTripDto) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      const vehicle = await tx.vehicle.findUnique({
        where: { id: dto.vehicleId },
      });
      if (!vehicle) throw new NotFoundException('Veículo não encontrado');
      if (vehicle.status !== VehicleStatus.ACTIVE) {
        throw new ConflictException(
          'Veículo inativo ou em manutenção não pode ser alocado',
        );
      }

      const driver = await tx.driver.findUnique({
        where: { id: dto.driverId },
      });
      if (!driver) throw new NotFoundException('Motorista não encontrado');
      if (!driver.isActive) throw new ConflictException('Motorista inativo');

      const departure = new Date(dto.plannedDepartureAt);
      const returnStart = new Date(dto.plannedReturnStartAt);

      if (returnStart <= departure) {
        throw new BadRequestException(
          'O horário de início do retorno deve ser posterior à saída',
        );
      }

      await this.assertNoVehicleConflict(
        tx,
        dto.vehicleId,
        departure,
        returnStart,
      );
      await this.assertNoDriverConflict(
        tx,
        dto.driverId,
        departure,
        returnStart,
      );

      const trip = await tx.trip.create({
        data: {
          vehicleId: dto.vehicleId,
          driverId: dto.driverId,
          municipalPickupPoint: dto.municipalPickupPoint.trim(),
          plannedDepartureAt: departure,
          plannedReturnStartAt: returnStart,
        },
        select: tripSelect,
      });

      await this.audit.record(tx, {
        actorUserId,
        action: 'TRIP_CREATED',
        entityType: 'Trip',
        entityId: trip.id,
        changes: {
          vehicleId: dto.vehicleId,
          driverId: dto.driverId,
          plannedDepartureAt: dto.plannedDepartureAt,
          plannedReturnStartAt: dto.plannedReturnStartAt,
        },
      });

      return trip;
    });
  }

  /** Edição de horários e alocação — somente antes do início (D-006, RN-14). */
  async update(actorUserId: string, id: string, dto: UpdateTripDto) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      const trip = await tx.trip.findUnique({ where: { id } });
      if (!trip) throw new NotFoundException('Viagem não encontrada');
      if (trip.status !== TripStatus.SCHEDULED) {
        throw new ConflictException(
          'Horários e alocação só podem ser alterados em viagens agendadas (antes do início)',
        );
      }

      const departure = dto.plannedDepartureAt
        ? new Date(dto.plannedDepartureAt)
        : trip.plannedDepartureAt;
      const returnStart = dto.plannedReturnStartAt
        ? new Date(dto.plannedReturnStartAt)
        : trip.plannedReturnStartAt;

      if (returnStart <= departure) {
        throw new BadRequestException(
          'O horário de início do retorno deve ser posterior à saída',
        );
      }

      if (dto.vehicleId && dto.vehicleId !== trip.vehicleId) {
        const vehicle = await tx.vehicle.findUnique({
          where: { id: dto.vehicleId },
        });
        if (!vehicle) throw new NotFoundException('Veículo não encontrado');
        if (vehicle.status !== VehicleStatus.ACTIVE) {
          throw new ConflictException(
            'Veículo inativo ou em manutenção não pode ser alocado',
          );
        }
        const occupied = await tripOccupancy(tx, id);
        if (occupied > vehicle.capacity) {
          throw new ConflictException(
            `O veículo escolhido possui capacidade para ${vehicle.capacity} passageiros, mas a viagem tem ${occupied} ocupantes`,
          );
        }
        await this.assertNoVehicleConflict(
          tx,
          dto.vehicleId,
          departure,
          returnStart,
          id,
        );
      } else if (dto.plannedDepartureAt || dto.plannedReturnStartAt) {
        await this.assertNoVehicleConflict(
          tx,
          trip.vehicleId,
          departure,
          returnStart,
          id,
        );
      }

      if (dto.driverId && dto.driverId !== trip.driverId) {
        const driver = await tx.driver.findUnique({
          where: { id: dto.driverId },
        });
        if (!driver) throw new NotFoundException('Motorista não encontrado');
        if (!driver.isActive) throw new ConflictException('Motorista inativo');
        await this.assertNoDriverConflict(
          tx,
          dto.driverId,
          departure,
          returnStart,
          id,
        );
      } else if (dto.plannedDepartureAt || dto.plannedReturnStartAt) {
        await this.assertNoDriverConflict(
          tx,
          trip.driverId,
          departure,
          returnStart,
          id,
        );
      }

      const before = {
        vehicleId: trip.vehicleId,
        driverId: trip.driverId,
        plannedDepartureAt: trip.plannedDepartureAt,
        plannedReturnStartAt: trip.plannedReturnStartAt,
      };

      const updated = await tx.trip.update({
        where: { id },
        data: {
          ...(dto.vehicleId && { vehicleId: dto.vehicleId }),
          ...(dto.driverId && { driverId: dto.driverId }),
          ...(dto.municipalPickupPoint && {
            municipalPickupPoint: dto.municipalPickupPoint,
          }),
          routeApprovedAt: null,
          routeApprovedByUserId: null,
          plannedDepartureAt: departure,
          plannedReturnStartAt: returnStart,
        },
        select: tripSelect,
      });

      await this.audit.record(tx, {
        actorUserId,
        action: 'TRIP_UPDATED',
        entityType: 'Trip',
        entityId: id,
        changes: { before, after: { vehicleId: dto.vehicleId ?? trip.vehicleId, driverId: dto.driverId ?? trip.driverId, plannedDepartureAt: departure.toISOString(), plannedReturnStartAt: returnStart.toISOString() }, fields: Object.keys(dto), routeApprovalInvalidated: true },
      });

      return updated;
    });
  }

  /** Início da viagem — horário real gerado pelo servidor (D-005, RN-13). */
  async start(actorUserId: string, id: string, driverUserId?: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      const trip = await findOperationalTrip(tx, id, driverUserId);
      if (trip.status !== TripStatus.SCHEDULED) {
        throw new ConflictException(
          'Apenas viagens agendadas podem ser iniciadas',
        );
      }

      if (driverUserId && !trip.routeApprovedAt) throw new ConflictException('Aguarde a aprovação da rota antes de iniciar');

      const now = new Date();
      const updated = await tx.trip.update({
        where: { id },
        data: { status: TripStatus.IN_PROGRESS, actualDepartureAt: now },
        select: tripSelect,
      });

      await this.audit.record(tx, {
        actorUserId,
        action: 'TRIP_STARTED',
        entityType: 'Trip',
        entityId: id,
        changes: { actualDepartureAt: now },
      });

      return updated;
    });
  }

  /** Encerramento da viagem — horário real gerado pelo servidor (D-005, RN-13). */
  async complete(actorUserId: string, id: string, driverUserId?: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      const trip = await findOperationalTrip(tx, id, driverUserId);
      if (trip.status !== TripStatus.IN_PROGRESS) {
        throw new ConflictException(
          'Apenas viagens em andamento podem ser encerradas',
        );
      }

      if (driverUserId && !trip.actualReturnStartAt) throw new ConflictException('Registre o início do retorno antes de concluir');

      const now = new Date();
      const updated = await tx.trip.update({
        where: { id },
        data: { status: TripStatus.COMPLETED, actualReturnAt: now },
        select: tripSelect,
      });

      await this.audit.record(tx, {
        actorUserId,
        action: 'TRIP_COMPLETED',
        entityType: 'Trip',
        entityId: id,
        changes: { actualReturnAt: now },
      });

      return updated;
    });
  }

  /** Cancelamento — somente antes do início (D-007, RN-16). */
  async cancel(actorUserId: string, id: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      const trip = await tx.trip.findUnique({ where: { id } });
      if (!trip) throw new NotFoundException('Viagem não encontrada');
      if (trip.status !== TripStatus.SCHEDULED) {
        throw new ConflictException(
          'Apenas viagens agendadas podem ser canceladas',
        );
      }

      const updated = await tx.trip.update({
        where: { id },
        data: {
          status: TripStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: new Date(),
          cancelledByUserId: actorUserId,
        },
        select: tripSelect,
      });

      await this.audit.record(tx, {
        actorUserId,
        action: 'TRIP_CANCELLED',
        entityType: 'Trip',
        entityId: id,
        changes: { reason },
      });

      return updated;
    });
  }

  /** Interrupção — somente após início, com motivo e providência (D-007, RN-16). */
  async interrupt(actorUserId: string, id: string, dto: InterruptTripDto) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      const trip = await tx.trip.findUnique({ where: { id } });
      if (!trip) throw new NotFoundException('Viagem não encontrada');
      if (trip.status !== TripStatus.IN_PROGRESS) {
        throw new ConflictException(
          'Apenas viagens em andamento podem ser interrompidas',
        );
      }

      const now = new Date();
      const updated = await tx.trip.update({
        where: { id },
        data: {
          status: TripStatus.INTERRUPTED,
          interruptionReason: dto.reason,
          interruptedAt: now,
          interruptedByUserId: actorUserId,
          interruptionAction: dto.action,
        },
        select: tripSelect,
      });

      await this.audit.record(tx, {
        actorUserId,
        action: 'TRIP_INTERRUPTED',
        entityType: 'Trip',
        entityId: id,
        reason: dto.reason,
        changes: { action: dto.action, interruptedAt: now },
      });

      return updated;
    });
  }

  /** Aprovação de rota pelo ADMIN (D-014, RN-06). */
  async approveRoute(actorUserId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      await assertRouteEditable(tx, id);
      await assertRouteComplete(tx, id);

      const now = new Date();
      const updated = await tx.trip.update({
        where: { id },
        data: { routeApprovedAt: now, routeApprovedByUserId: actorUserId },
        select: tripSelect,
      });

      await this.audit.record(tx, {
        actorUserId,
        action: 'TRIP_ROUTE_APPROVED',
        entityType: 'Trip',
        entityId: id,
        changes: { routeApprovedAt: now },
      });

      return updated;
    });
  }

  async startReturn(actorUserId: string, id: string, driverUserId?: string) {
    return this.prisma.$transaction(async tx => {
      await lockOperationalIntegrity(tx);
      const trip = await findOperationalTrip(tx, id, driverUserId);
      if (trip.status !== TripStatus.IN_PROGRESS || trip.actualReturnStartAt) throw new ConflictException('O retorno só pode ser iniciado uma vez, durante a viagem');
      const now = new Date();
      const updated = await tx.trip.update({ where: { id }, data: { actualReturnStartAt: now }, select: tripSelect });
      await this.audit.record(tx, { actorUserId, action: 'TRIP_RETURN_STARTED', entityType: 'Trip', entityId: id, changes: { actualReturnStartAt: now } });
      return updated;
    });
  }

  async addObservation(actorUserId: string, id: string, description: string, driverUserId?: string, options?: { type: TripObservationType; patientTripId?: string }) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      const trip = await findOperationalTrip(tx, id, driverUserId);
      if (driverUserId && trip.status !== TripStatus.IN_PROGRESS) throw new ConflictException('Ocorrências operacionais exigem viagem em andamento');
      if (options?.type === 'CONTACT_ATTEMPT' && !options.patientTripId) throw new BadRequestException('Selecione a participação para registrar a tentativa de contato');
      if (options?.patientTripId) {
        const participant = await tx.patientTrip.findFirst({ where: { id: options.patientTripId, tripId: id, cancelledAt: null }, select: { id: true } });
        if (!participant) throw new NotFoundException('Participação não encontrada');
      }
      const observation = await tx.tripObservation.create({
        data: {
          tripId: id,
          authorId: actorUserId,
          description: description.trim(),
          ...(options && { type: options.type, patientTripId: options.patientTripId }),
        },
      });
      await this.audit.record(tx, {
        actorUserId,
        action: 'TRIP_OBSERVATION_CREATED',
        entityType: 'Trip',
        entityId: id,
        changes: { observationId: observation.id, type: options?.type ?? 'INCIDENT', patientTripId: options?.patientTripId ?? null },
      });
      return observation;
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private async assertNoVehicleConflict(
    tx: Prisma.TransactionClient,
    vehicleId: string,
    departure: Date,
    returnStart: Date,
    excludeId?: string,
  ) {
    const count = await tx.trip.count({
      where: {
        vehicleId,
        status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
        plannedDepartureAt: { lte: returnStart },
        plannedReturnStartAt: { gte: departure },
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    if (count > 0)
      throw new ConflictException('Veículo já possui viagem neste período');
  }

  private async assertNoDriverConflict(
    tx: Prisma.TransactionClient,
    driverId: string,
    departure: Date,
    returnStart: Date,
    excludeId?: string,
  ) {
    const count = await tx.trip.count({
      where: {
        driverId,
        status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
        plannedDepartureAt: { lte: returnStart },
        plannedReturnStartAt: { gte: departure },
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    if (count > 0)
      throw new ConflictException('Motorista já possui viagem neste período');
  }
}
