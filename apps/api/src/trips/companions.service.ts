import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export class CreateCompanionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  relationship?: string;
}

export class UpdateCompanionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone?: string;

  @IsOptional()
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
  constructor(private readonly prisma: PrismaService) {}

  async list(patientTripId: string) {
    await this.findPatientTripOrThrow(patientTripId);
    return this.prisma.tripCompanion.findMany({
      where: { patientTripId },
      select: companionSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(patientTripId: string, dto: CreateCompanionDto) {
    return this.prisma.$transaction(async (tx) => {
      const patientTrip = await this.findPatientTripOrThrow(patientTripId, tx);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${patientTrip.tripId}, 0))`;
      const existing = await tx.tripCompanion.count({
        where: { patientTripId },
      });
      if (existing >= 1)
        throw new ConflictException(
          'Cada paciente pode ter somente um acompanhante',
        );
      await this.assertCapacity(patientTrip.tripId, 1, tx);

      return tx.tripCompanion.create({
        data: {
          patientTripId,
          name: dto.name.trim(),
          phone: dto.phone.trim(),
          relationship: dto.relationship?.trim() || null,
        },
        select: companionSelect,
      });
    });
  }

  async update(
    patientTripId: string,
    companionId: string,
    dto: UpdateCompanionDto,
  ) {
    await this.findCompanionOrThrow(patientTripId, companionId);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.relationship !== undefined)
      data.relationship = dto.relationship?.trim() || null;

    return this.prisma.tripCompanion.update({
      where: { id: companionId },
      data,
      select: companionSelect,
    });
  }

  async remove(patientTripId: string, companionId: string) {
    await this.findCompanionOrThrow(patientTripId, companionId);
    await this.prisma.tripCompanion.delete({ where: { id: companionId } });
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private async findPatientTripOrThrow(
    patientTripId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const pt = await client.patientTrip.findUnique({
      where: { id: patientTripId },
      select: { id: true, tripId: true },
    });
    if (!pt) throw new NotFoundException('Participação não encontrada');
    return pt;
  }

  private async findCompanionOrThrow(
    patientTripId: string,
    companionId: string,
  ) {
    const c = await this.prisma.tripCompanion.findUnique({
      where: { id: companionId },
      select: { id: true, patientTripId: true },
    });
    if (!c || c.patientTripId !== patientTripId) {
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
    const trip = await client.trip.findUnique({
      where: { id: tripId },
      select: {
        vehicle: { select: { capacity: true } },
        _count: { select: { patientTrips: true } },
        patientTrips: { select: { _count: { select: { companions: true } } } },
      },
    });
    if (!trip) throw new NotFoundException('Viagem não encontrada');

    const totalCompanions = trip.patientTrips.reduce(
      (sum, pt) => sum + pt._count.companions,
      0,
    );
    const occupied = trip._count.patientTrips + totalCompanions;

    if (occupied + adding > trip.vehicle.capacity) {
      throw new ConflictException(
        `Capacidade do veículo (${trip.vehicle.capacity}) seria excedida. Ocupação atual: ${occupied}.`,
      );
    }
  }
}
