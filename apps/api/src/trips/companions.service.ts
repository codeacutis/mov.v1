import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { AuditService } from '../audit/audit.service';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Prisma } from '../generated/prisma/client';
import { tripOccupancy, lockOperationalIntegrity } from '../common/operational-integrity';
import { PrismaService } from '../prisma/prisma.service';

export class CreateCompanionDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(60)
  relationship?: string;
}

export class UpdateCompanionDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(60)
  relationship?: string;
}

const companionSelect = {
  id: true,
  patientTripId: true,
  name: true,
  phone: true,
  relationship: true,
  createdAt: true,
} as const;

@Injectable()
export class CompanionsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list(patientTripId: string) {
    await this.findPatientTripOrThrow(patientTripId);
    return this.prisma.tripCompanion.findMany({
      where: { patientTripId, removedAt: null },
      select: companionSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(patientTripId: string, dto: CreateCompanionDto, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      const patientTrip = await this.findPatientTripOrThrow(patientTripId, tx, true);
      const existing = await tx.tripCompanion.count({
        where: { patientTripId, removedAt: null },
      });
      if (existing >= 1)
        throw new ConflictException(
          'Cada paciente pode ter somente um acompanhante',
        );
      await this.assertCapacity(patientTrip.tripId, 1, tx);

      const created = await tx.tripCompanion.create({
        data: {
          patientTripId,
          name: dto.name.trim(),
          phone: dto.phone.trim(),
          relationship: dto.relationship?.trim() || null,
        },
        select: companionSelect,
      });
      await this.audit.record(tx, { actorUserId, action: 'COMPANION_CREATED', entityType: 'TripCompanion', entityId: created.id, changes: { patientTripId } });
      return created;
    });
  }

  async update(
    patientTripId: string,
    companionId: string,
    dto: UpdateCompanionDto,
    actorUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      await this.findPatientTripOrThrow(patientTripId, tx, true);
      await this.findCompanionOrThrow(patientTripId, companionId, tx);
      const data: Record<string, unknown> = {};
      if (dto.name !== undefined) data.name = dto.name.trim();
      if (dto.phone !== undefined) data.phone = dto.phone.trim();
      if (dto.relationship !== undefined)
        data.relationship = dto.relationship?.trim() || null;

      const updated = await tx.tripCompanion.update({
        where: { id: companionId },
        data,
        select: companionSelect,
      });
      await this.audit.record(tx, { actorUserId, action: 'COMPANION_UPDATED', entityType: 'TripCompanion', entityId: companionId, changes: { patientTripId, fields: Object.keys(data) } });
      return updated;
    });
  }

  async remove(patientTripId: string, companionId: string, actorUserId: string) {
    await this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      await this.findPatientTripOrThrow(patientTripId, tx, true);
      await this.findCompanionOrThrow(patientTripId, companionId, tx);
      await tx.tripCompanion.update({ where: { id: companionId }, data: { removedAt: new Date() } });
      await this.audit.record(tx, { actorUserId, action: 'COMPANION_REMOVED', entityType: 'TripCompanion', entityId: companionId, changes: { patientTripId } });
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private async findPatientTripOrThrow(
    patientTripId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
    editing = false,
  ) {
    const pt = await client.patientTrip.findUnique({
      where: { id: patientTripId },
      select: { id: true, tripId: true, cancelledAt: true, trip: { select: { status: true } } },
    });
    if (!pt) throw new NotFoundException('Participação não encontrada');
    if (editing && (pt.cancelledAt || pt.trip.status !== 'SCHEDULED')) throw new ConflictException('Acompanhantes só podem ser alterados em participações ativas antes do início');
    return pt;
  }

  private async findCompanionOrThrow(
    patientTripId: string,
    companionId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const c = await client.tripCompanion.findUnique({
      where: { id: companionId },
      select: { id: true, patientTripId: true, removedAt: true },
    });
    if (!c || c.removedAt || c.patientTripId !== patientTripId) {
      throw new NotFoundException('Acompanhante não encontrado');
    }
    return c;
  }

  /**
   * Verifica se adicionar `adding` ocupantes ainda respeita a capacidade do veículo.
   * Ocupação = nº de patientTrips + nº total de companions na viagem.
   */
  private async assertCapacity(
    tripId: string,
    adding: number,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const trip = await client.trip.findUnique({ where: { id: tripId }, select: { vehicle: { select: { capacity: true } } } });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    const occupied = await tripOccupancy(client as Prisma.TransactionClient, tripId);
    if (occupied + adding > trip.vehicle.capacity) throw new ConflictException(`Capacidade do veículo (${trip.vehicle.capacity}) seria excedida. Ocupação atual: ${occupied}.`);
  }
}
