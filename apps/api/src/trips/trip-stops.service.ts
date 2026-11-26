import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Prisma, StopDirection } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripStopDto } from './dto/create-trip-stop.dto';
import { lockOperationalIntegrity } from '../common/operational-integrity';
import {
  assertRouteEditable,
  invalidateRoute,
  reverseStopType,
} from './route-integrity';

const stopSelect = {
  id: true,
  tripId: true,
  direction: true,
  sequence: true,
  name: true,
  address: true,
  municipality: true,
  stopType: true,
  plannedArrivalAt: true,
  notes: true,
  outboundPatientTrips: {
    where: { cancelledAt: null },
    select: { id: true, patient: { select: { id: true, name: true } } },
  },
  returnPatientTrips: {
    where: { cancelledAt: null },
    select: { id: true, patient: { select: { id: true, name: true } } },
  },
} satisfies Prisma.TripStopSelect;

@Injectable()
export class TripStopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listByTrip(tripId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    return this.prisma.tripStop.findMany({
      where: { tripId },
      select: stopSelect,
      orderBy: [{ direction: 'asc' }, { sequence: 'asc' }],
    });
  }

  async create(actorUserId: string, tripId: string, dto: CreateTripStopDto) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      await assertRouteEditable(tx, tripId);
      await this.validatePatients(tx, tripId, dto);

      const conflict = await tx.tripStop.findFirst({
        where: { tripId, direction: dto.direction, sequence: dto.sequence },
      });
      if (conflict) {
        throw new BadRequestException(
          `Já existe uma parada na sequência ${dto.sequence} para esta direção`,
        );
      }

      const stop = await tx.tripStop.create({
        data: {
          tripId,
          direction: dto.direction,
          sequence: dto.sequence,
          name: dto.name.trim(),
          address: dto.address.trim(),
          municipality: dto.municipality.trim(),
          stopType: dto.stopType,
          plannedArrivalAt: dto.plannedArrivalAt
            ? new Date(dto.plannedArrivalAt)
            : null,
          notes: dto.notes?.trim() || null,
        },
        select: { id: true },
      });

      if (dto.patients?.length) {
        const field =
          dto.direction === StopDirection.OUTBOUND
            ? 'outboundStopId'
            : 'returnStopId';
        await tx.patientTrip.updateMany({
          where: {
            tripId,
            cancelledAt: null,
            patientId: { in: dto.patients.map((p) => p.patientId) },
          },
          data: { [field]: stop.id },
        });
      }

      if (dto.direction === 'OUTBOUND') await this.syncReturn(tx, tripId);
      await invalidateRoute(tx, tripId);

      await this.audit.record(tx, {
        actorUserId,
        action: 'TRIP_STOP_CREATED',
        entityType: 'TripStop',
        entityId: stop.id,
        changes: {
          tripId,
          direction: dto.direction,
          sequence: dto.sequence,
          routeApprovalInvalidated: true,
        },
      });

      return tx.tripStop.findUnique({
        where: { id: stop.id },
        select: stopSelect,
      });
    });
  }

  async remove(actorUserId: string, tripId: string, stopId: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      await assertRouteEditable(tx, tripId);
      const stop = await tx.tripStop.findFirst({
        where: { id: stopId, tripId },
      });
      if (!stop) throw new NotFoundException('Parada não encontrada');

      await tx.patientTrip.updateMany({
        where: { tripId, outboundStopId: stopId },
        data: { outboundStopId: null },
      });
      await tx.patientTrip.updateMany({
        where: { tripId, returnStopId: stopId },
        data: { returnStopId: null },
      });

      await tx.tripStop.delete({ where: { id: stopId } });
      if (stop.direction === 'OUTBOUND') await this.syncReturn(tx, tripId);
      await invalidateRoute(tx, tripId);

      await this.audit.record(tx, {
        actorUserId,
        action: 'TRIP_STOP_REMOVED',
        entityType: 'TripStop',
        entityId: stopId,
        changes: { tripId, routeApprovalInvalidated: true },
      });
    });
  }

  async update(
    actorUserId: string,
    tripId: string,
    stopId: string,
    dto: CreateTripStopDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      await assertRouteEditable(tx, tripId);
      const stop = await tx.tripStop.findFirst({
        where: { id: stopId, tripId },
      });
      if (!stop) throw new NotFoundException('Parada não encontrada');
      if (stop.direction !== dto.direction)
        throw new BadRequestException(
          'A direção da parada não pode ser alterada',
        );
      await this.validatePatients(tx, tripId, dto);
      const conflict = await tx.tripStop.findFirst({
        where: {
          tripId,
          direction: dto.direction,
          sequence: dto.sequence,
          id: { not: stopId },
        },
      });
      if (conflict)
        throw new BadRequestException(
          'Sequência ocupada. Utilize os controles de reordenação',
        );
      await tx.tripStop.update({
        where: { id: stopId },
        data: {
          sequence: dto.sequence,
          name: dto.name.trim(),
          address: dto.address.trim(),
          municipality: dto.municipality.trim(),
          stopType: dto.stopType,
          plannedArrivalAt: dto.plannedArrivalAt
            ? new Date(dto.plannedArrivalAt)
            : null,
          notes: dto.notes?.trim() || null,
        },
      });
      if (dto.patients !== undefined) {
        const field =
          dto.direction === 'OUTBOUND' ? 'outboundStopId' : 'returnStopId';
        await tx.patientTrip.updateMany({
          where: { tripId, cancelledAt: null, [field]: stopId },
          data: { [field]: null },
        });
        await tx.patientTrip.updateMany({
          where: {
            tripId,
            cancelledAt: null,
            patientId: { in: dto.patients.map((p) => p.patientId) },
          },
          data: { [field]: stopId },
        });
      }
      if (dto.direction === 'OUTBOUND') await this.syncReturn(tx, tripId);
      await invalidateRoute(tx, tripId);
      await this.audit.record(tx, {
        actorUserId,
        action: 'TRIP_STOP_UPDATED',
        entityType: 'TripStop',
        entityId: stopId,
        changes: {
          tripId,
          routeApprovalInvalidated: true,
          sequence: dto.sequence,
          patientIds: dto.patients?.map((p) => p.patientId) ?? [],
        },
      });
      return tx.tripStop.findUnique({
        where: { id: stopId },
        select: stopSelect,
      });
    });
  }

  async reorder(
    actorUserId: string,
    tripId: string,
    direction: StopDirection,
    stopIds: string[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      await assertRouteEditable(tx, tripId);
      if (direction !== 'OUTBOUND')
        throw new BadRequestException(
          'Organize a ida; o retorno segue a ordem inversa',
        );
      const stops = await tx.tripStop.findMany({
        where: { tripId, direction },
      });
      if (
        stops.length !== stopIds.length ||
        new Set(stopIds).size !== stopIds.length ||
        stops.some((s) => !stopIds.includes(s.id))
      )
        throw new BadRequestException(
          'Informe todas as paradas da ida uma única vez',
        );
      // Temporary positive keys respect the database CHECK and unique index.
      const offset =
        Math.max(stops.length, ...stops.map((s) => s.sequence)) + 1;
      if (offset + stops.length > 2147483647)
        throw new BadRequestException('Sequência fora do intervalo suportado');
      for (const [index, stop] of stops.entries())
        await tx.tripStop.update({
          where: { id: stop.id },
          data: { sequence: offset + index },
        });
      for (const [index, id] of stopIds.entries())
        await tx.tripStop.update({
          where: { id },
          data: { sequence: index + 1 },
        });
      await this.syncReturn(tx, tripId);
      await invalidateRoute(tx, tripId);
      await this.audit.record(tx, {
        actorUserId,
        action: 'TRIP_STOPS_REORDERED',
        entityType: 'Trip',
        entityId: tripId,
        changes: {
          before: stops
            .sort((a, b) => a.sequence - b.sequence)
            .map((s) => s.id),
          after: stopIds,
          routeApprovalInvalidated: true,
        },
      });
    });
  }

  async rebuildReturn(actorUserId: string, tripId: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      await assertRouteEditable(tx, tripId);
      await this.syncReturn(tx, tripId);
      await invalidateRoute(tx, tripId);
      await this.audit.record(tx, {
        actorUserId,
        action: 'TRIP_RETURN_REBUILT',
        entityType: 'Trip',
        entityId: tripId,
        changes: { routeApprovalInvalidated: true },
      });
    });
  }

  private async validatePatients(
    tx: Prisma.TransactionClient,
    tripId: string,
    dto: CreateTripStopDto,
  ) {
    const ids = dto.patients?.map((p) => p.patientId) ?? [];
    if (ids.length && dto.stopType !== 'APPOINTMENT')
      throw new BadRequestException(
        'Associe pacientes à parada do estabelecimento da consulta',
      );
    const count = await tx.patientTrip.count({
      where: { tripId, cancelledAt: null, patientId: { in: ids } },
    });
    if (new Set(ids).size !== ids.length || count !== ids.length)
      throw new BadRequestException(
        'Selecione somente participantes ativos desta viagem, sem duplicidade',
      );
  }

  private async syncReturn(tx: Prisma.TransactionClient, tripId: string) {
    const outbound = await tx.tripStop.findMany({
      where: { tripId, direction: 'OUTBOUND' },
      orderBy: { sequence: 'asc' },
    });
    const returning = await tx.tripStop.findMany({
      where: { tripId, direction: 'RETURN' },
    });
    for (const stop of outbound) {
      const existing = returning.find((s) => s.sequence === stop.sequence);
      const data = {
        name: stop.name,
        address: stop.address,
        municipality: stop.municipality,
        stopType: reverseStopType(stop.stopType),
        notes: stop.notes,
      };
      const back = existing
        ? await tx.tripStop.update({
            where: { id: existing.id },
            data: {
              ...data,
              ...((existing.address !== stop.address ||
                existing.name !== stop.name ||
                existing.municipality !== stop.municipality) && {
                plannedArrivalAt: null,
              }),
            },
          })
        : await tx.tripStop.create({
            data: {
              ...data,
              tripId,
              direction: 'RETURN',
              sequence: stop.sequence,
            },
          });
      await tx.patientTrip.updateMany({
        where: { tripId, cancelledAt: null, returnStopId: back.id },
        data: { returnStopId: null },
      });
      await tx.patientTrip.updateMany({
        where: { tripId, cancelledAt: null, outboundStopId: stop.id },
        data: { returnStopId: back.id },
      });
    }
    const obsolete = returning
      .filter((s) => !outbound.some((o) => o.sequence === s.sequence))
      .map((s) => s.id);
    await tx.patientTrip.updateMany({
      where: { tripId, returnStopId: { in: obsolete } },
      data: { returnStopId: null },
    });
    await tx.tripStop.deleteMany({ where: { tripId, id: { in: obsolete } } });
  }
}
