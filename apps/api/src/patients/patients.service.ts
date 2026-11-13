import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto';

const patientSelect = {
  id: true,
  name: true,
  birthDate: true,
  phone: true,
  susCardNumber: true,
  address: true,
  usesWheelchair: true,
  hasReducedMobility: true,
  needsBoardingAssistance: true,
  operationalNotes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PatientSelect;

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.patient.findMany({
      select: patientSelect,
      orderBy: { name: 'asc' },
    });
  }

  async create(actorUserId: string, dto: CreatePatientDto) {
    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          name: dto.name.trim(),
          birthDate: new Date(dto.birthDate),
          phone: dto.phone?.trim() || null,
          susCardNumber: dto.susCardNumber?.trim() || null,
          address: dto.address?.trim() || null,
          usesWheelchair: dto.usesWheelchair ?? false,
          hasReducedMobility: dto.hasReducedMobility ?? false,
          needsBoardingAssistance: dto.needsBoardingAssistance ?? false,
          operationalNotes: dto.operationalNotes?.trim() || null,
        },
        select: patientSelect,
      });
      await this.audit.record(tx, {
        actorUserId,
        action: 'PATIENT_CREATED',
        entityType: 'Patient',
        entityId: patient.id,
        changes: { fields: ['name', 'birthDate'] },
      });
      return patient;
    });
  }

  async update(actorUserId: string, id: string, dto: UpdatePatientDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.patient.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Paciente não encontrado');

      const data: Prisma.PatientUpdateInput = {};
      if (dto.name !== undefined) data.name = dto.name.trim();
      if (dto.birthDate !== undefined) data.birthDate = new Date(dto.birthDate);
      if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
      if (dto.susCardNumber !== undefined)
        data.susCardNumber = dto.susCardNumber?.trim() || null;
      if (dto.address !== undefined) data.address = dto.address?.trim() || null;
      if (dto.usesWheelchair !== undefined)
        data.usesWheelchair = dto.usesWheelchair;
      if (dto.hasReducedMobility !== undefined)
        data.hasReducedMobility = dto.hasReducedMobility;
      if (dto.needsBoardingAssistance !== undefined)
        data.needsBoardingAssistance = dto.needsBoardingAssistance;
      if (dto.operationalNotes !== undefined)
        data.operationalNotes = dto.operationalNotes?.trim() || null;

      const patient = await tx.patient.update({
        where: { id },
        data,
        select: patientSelect,
      });
      await this.audit.record(tx, {
        actorUserId,
        action: 'PATIENT_UPDATED',
        entityType: 'Patient',
        entityId: id,
        changes: { fields: Object.keys(dto) },
      });
      return patient;
    });
  }

  async inactivate(actorUserId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.patient.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Paciente não encontrado');
      if (!current.isActive) return current;

      const patient = await tx.patient.update({
        where: { id },
        data: { isActive: false },
        select: patientSelect,
      });
      await this.audit.record(tx, {
        actorUserId,
        action: 'PATIENT_INACTIVATED',
        entityType: 'Patient',
        entityId: id,
        changes: { isActive: { from: true, to: false } },
      });
      return patient;
    });
  }
}
