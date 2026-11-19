import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Prisma, StopDirection } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripStopDto } from './dto/create-trip-stop.dto';

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
    select: { id: true, patient: { select: { id: true, name: true } } },
  },
  returnPatientTrips: {
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
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new NotFoundException('Viagem não encontrada');

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
            patientId: { in: dto.patients.map((p) => p.patientId) },
          },
          data: { [field]: stop.id },
        });
      }

      await this.audit.record(tx, {
        actorUserId,
        action: 'TRIP_STOP_CREATED',
        entityType: 'TripStop',
        entityId: stop.id,
        changes: { tripId, direction: dto.direction, sequence: dto.sequence },
      });

      return tx.tripStop.findUnique({ where: { id: stop.id }, select: stopSelect });
    });
  }

  async remove(actorUserId: string, tripId: string, stopId: string) {
    return this.prisma.$transaction(async (tx) => {
      const stop = await tx.tripStop.findFirst({ where: { id: stopId, tripId } });
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

      await this.audit.record(tx, {
        actorUserId,
        action: 'TRIP_STOP_REMOVED',
        entityType: 'TripStop',
        entityId: stopId,
        changes: { tripId },
      });
    });
  }
}
