import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Prisma, TripStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';

const tripSelect = {
  id: true,
  municipalPickupPoint: true,
  plannedDepartureAt: true,
  plannedReturnStartAt: true,
  actualDepartureAt: true,
  actualReturnAt: true,
  status: true,
  createdAt: true,
  vehicle: { select: { id: true, plate: true, capacity: true } },
  driver: { select: { id: true, user: { select: { id: true, name: true } } } },
  _count: { select: { patientTrips: true } },
} satisfies Prisma.TripSelect;

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.trip.findMany({
      select: tripSelect,
      orderBy: { plannedDepartureAt: 'desc' },
    });
  }

  async create(actorUserId: string, dto: CreateTripDto) {
    return this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id: dto.vehicleId } });
      if (!vehicle) throw new NotFoundException('Veículo não encontrado');

      const driver = await tx.driver.findUnique({ where: { id: dto.driverId } });
      if (!driver) throw new NotFoundException('Motorista não encontrado');

      const departure = new Date(dto.plannedDepartureAt);
      const returnStart = new Date(dto.plannedReturnStartAt);

      // Verificar conflito de veículo
      const vehicleConflict = await tx.trip.count({
        where: {
          vehicleId: dto.vehicleId,
          status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
          plannedDepartureAt: { lte: returnStart },
          plannedReturnStartAt: { gte: departure },
        },
      });
      if (vehicleConflict > 0) {
        throw new ConflictException('Veículo já possui viagem neste período');
      }

      // Verificar conflito de motorista
      const driverConflict = await tx.trip.count({
        where: {
          driverId: dto.driverId,
          status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
          plannedDepartureAt: { lte: returnStart },
          plannedReturnStartAt: { gte: departure },
        },
      });
      if (driverConflict > 0) {
        throw new ConflictException('Motorista já possui viagem neste período');
      }

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
        },
      });

      return trip;
    });
  }

  async cancel(actorUserId: string, id: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id } });
      if (!trip) throw new NotFoundException('Viagem não encontrada');
      if (trip.status !== TripStatus.SCHEDULED) {
        throw new ConflictException('Apenas viagens agendadas podem ser canceladas');
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
}
