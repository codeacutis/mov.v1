import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Prisma, TripStatus, VehicleStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.vehicle.findMany({ orderBy: { plate: 'asc' } });
  }

  async create(actorUserId: string, dto: CreateVehicleDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.create({
          data: {
            plate: dto.plate.trim().toUpperCase(),
            description: dto.description?.trim() || null,
            capacity: dto.capacity,
            status: dto.status ?? VehicleStatus.ACTIVE,
          },
        });
        await this.audit.record(tx, {
          actorUserId,
          action: 'VEHICLE_CREATED',
          entityType: 'Vehicle',
          entityId: vehicle.id,
          changes: { fields: ['plate', 'description', 'capacity', 'status'] },
        });
        return vehicle;
      });
    } catch (error) {
      this.throwIfDuplicatePlate(error);
      throw error;
    }
  }

  async update(actorUserId: string, id: string, dto: UpdateVehicleDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Informe ao menos um campo para alterar');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await tx.vehicle.findUnique({ where: { id } });
        if (!current) throw new NotFoundException('Veículo não encontrado');

        if (
          dto.status !== undefined &&
          dto.status !== current.status &&
          dto.status !== VehicleStatus.ACTIVE
        ) {
          await this.ensureNoActiveTrips(tx, id);
        }

        const data: Prisma.VehicleUpdateInput = {};
        if (dto.plate !== undefined) data.plate = dto.plate.trim().toUpperCase();
        if (dto.description !== undefined) {
          data.description = dto.description?.trim() || null;
        }
        if (dto.capacity !== undefined) data.capacity = dto.capacity;
        if (dto.status !== undefined) data.status = dto.status;

        const vehicle = await tx.vehicle.update({ where: { id }, data });
        await this.audit.record(tx, {
          actorUserId,
          action: 'VEHICLE_UPDATED',
          entityType: 'Vehicle',
          entityId: vehicle.id,
          changes: { fields: Object.keys(dto) },
        });
        return vehicle;
      });
    } catch (error) {
      this.throwIfDuplicatePlate(error);
      throw error;
    }
  }

  async inactivate(actorUserId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.vehicle.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Veículo não encontrado');
      if (current.status === VehicleStatus.INACTIVE) return current;

      await this.ensureNoActiveTrips(tx, id);
      const vehicle = await tx.vehicle.update({
        where: { id },
        data: { status: VehicleStatus.INACTIVE },
      });
      await this.audit.record(tx, {
        actorUserId,
        action: 'VEHICLE_INACTIVATED',
        entityType: 'Vehicle',
        entityId: vehicle.id,
        changes: { status: { from: current.status, to: vehicle.status } },
      });
      return vehicle;
    });
  }

  private async ensureNoActiveTrips(
    tx: Prisma.TransactionClient,
    vehicleId: string,
  ): Promise<void> {
    const activeTrips = await tx.trip.count({
      where: {
        vehicleId,
        status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
      },
    });
    if (activeTrips > 0) {
      throw new ConflictException(
        'O veículo possui viagens agendadas ou em andamento',
      );
    }
  }

  private throwIfDuplicatePlate(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Já existe um veículo com essa placa');
    }
  }
}