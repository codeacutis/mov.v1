import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { tripOccupancy, lockOperationalIntegrity } from '../common/operational-integrity';
import {
  OutboundStatus,
  Prisma,
  ReturnStatus,
  TripStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { invalidateRoute } from './route-integrity';
import { assignedDriver, DriverOperationScope } from './driver-operation-scope';
import {
  CreatePatientTripDto,
  UpdatePatientTripDto,
  UpdateReturnStatusDto,
} from './dto/patient-trip.dto';

const patientTripSelect = {
  cancelledAt: true,
  cancellationReason: true,
  cancelledByUserId: true,
  id: true,
  tripId: true,
  patientId: true,
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
  returnAbsenceReason: true,
  returnAbsenceReportedAt: true,
  outboundStopId: true,
  returnStopId: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: { id: true, name: true, phone: true } },
  priorityDefinedBy: { select: { id: true, name: true } },
  returnAbsenceReportedBy: { select: { id: true, name: true } },
  _count: { select: { companions: { where: { removedAt: null } } } },
} satisfies Prisma.PatientTripSelect;

@Injectable()
export class PatientTripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tripId: string) {
    await this.findTripOrThrow(tripId);
    return this.prisma.patientTrip.findMany({
      where: { tripId },
      select: patientTripSelect,
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(actorUserId: string, tripId: string, dto: CreatePatientTripDto) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      const trip = await this.findTripOrThrow(tripId, tx);
      if (trip.status !== TripStatus.SCHEDULED)
        throw new ConflictException(
          'Pacientes só podem ser incluídos em viagens agendadas',
        );
      const patient = await tx.patient.findUnique({
        where: { id: dto.patientId },
        select: { id: true, isActive: true },
      });
      if (!patient) throw new NotFoundException('Paciente não encontrado');
      if (!patient.isActive)
        throw new ConflictException(
          'Paciente inativo não pode ser incluído na viagem',
        );
      const occupied = await tripOccupancy(tx, tripId);
      if (occupied + 1 > trip.vehicle.capacity)
        throw new ConflictException(
          `Capacidade do veículo (${trip.vehicle.capacity}) seria excedida`,
        );

      try {
        const created = await tx.patientTrip.create({
          data: {
            tripId,
            patientId: dto.patientId,
            appointmentLocationName: dto.appointmentLocationName.trim(),
            appointmentAddress: dto.appointmentAddress.trim(),
            appointmentMunicipality: dto.appointmentMunicipality.trim(),
            appointmentAt: new Date(dto.appointmentAt),
            priority: dto.priority,
            priorityJustification: dto.priorityJustification.trim(),
            priorityDefinedByUserId: actorUserId,
            priorityDefinedAt: new Date(),
          },
          select: patientTripSelect,
        });
        await this.audit.record(tx, {
          actorUserId,
          action: 'PATIENT_TRIP_CREATED',
          entityType: 'PatientTrip',
          entityId: created.id,
          reason: dto.priorityJustification.trim(),
          changes: { tripId, patientId: dto.patientId, priority: dto.priority, routeApprovalInvalidated: true },
        });
        await invalidateRoute(tx, tripId);
        return created;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        )
          throw new ConflictException('Paciente já participa desta viagem');
        throw error;
      }
    });
  }

  async cancel(actorUserId: string, id: string, reason: string) {
    return this.prisma.$transaction(async tx => {
      await lockOperationalIntegrity(tx);
      const current = await this.findOrThrow(id, tx);
      if (current.trip.status !== TripStatus.SCHEDULED) throw new ConflictException('Participações só podem ser canceladas antes do início');
      if (current.cancelledAt) throw new ConflictException('Participação já cancelada');
      const updated = await tx.patientTrip.update({ where: { id }, data: { cancelledAt: new Date(), cancelledByUserId: actorUserId, cancellationReason: reason.trim() }, select: patientTripSelect });
      await invalidateRoute(tx, current.tripId);
      await this.audit.record(tx, { actorUserId, action: 'PATIENT_TRIP_CANCELLED', entityType: 'PatientTrip', entityId: id, reason: reason.trim(), changes: { routeApprovalInvalidated: true } });
      return updated;
    });
  }

  async update(actorUserId: string, id: string, dto: UpdatePatientTripDto) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      const current = await this.findOrThrow(id, tx);
      if (current.cancelledAt) throw new ConflictException('Participação cancelada não pode ser alterada');
      if (current.trip.status !== TripStatus.SCHEDULED)
        throw new ConflictException(
          'Dados planejados só podem ser alterados antes do início da viagem',
        );
      if (dto.priorityJustification !== undefined && dto.priority === undefined)
        throw new BadRequestException(
          'A justificativa de prioridade deve acompanhar uma prioridade',
        );
      if (dto.priority !== undefined && !dto.priorityJustification?.trim())
        throw new BadRequestException(
          'Justificativa é obrigatória ao alterar a prioridade',
        );
      const priorityChanged =
        dto.priority !== undefined && dto.priority !== current.priority;
      const updated = await tx.patientTrip.update({
        where: { id },
        data: {
          ...(dto.appointmentLocationName !== undefined && {
            appointmentLocationName: dto.appointmentLocationName.trim(),
          }),
          ...(dto.appointmentAddress !== undefined && {
            appointmentAddress: dto.appointmentAddress.trim(),
          }),
          ...(dto.appointmentMunicipality !== undefined && {
            appointmentMunicipality: dto.appointmentMunicipality.trim(),
          }),
          ...(dto.appointmentAt !== undefined && {
            appointmentAt: new Date(dto.appointmentAt),
          }),
          ...(dto.confirmationStatus !== undefined && {
            confirmationStatus: dto.confirmationStatus,
          }),
          ...(dto.priority !== undefined && {
            priority: dto.priority,
            priorityJustification: dto.priorityJustification!.trim(),
            priorityDefinedByUserId: actorUserId,
            priorityDefinedAt: new Date(),
          }),
        },
        select: patientTripSelect,
      });
      await this.audit.record(tx, {
        actorUserId,
        action: priorityChanged
          ? 'PATIENT_TRIP_PRIORITY_CHANGED'
          : 'PATIENT_TRIP_UPDATED',
        entityType: 'PatientTrip',
        entityId: id,
        reason: dto.priorityJustification?.trim(),
        changes: {
          routeApprovalInvalidated: dto.appointmentLocationName !== undefined || dto.appointmentAddress !== undefined || dto.appointmentMunicipality !== undefined || dto.appointmentAt !== undefined,
          before: {
            priority: current.priority,
            confirmationStatus: current.confirmationStatus,
          },
          after: {
            priority: updated.priority,
            confirmationStatus: updated.confirmationStatus,
          },
        },
      });
      if (dto.appointmentLocationName !== undefined || dto.appointmentAddress !== undefined || dto.appointmentMunicipality !== undefined || dto.appointmentAt !== undefined) await invalidateRoute(tx, current.tripId);
      return updated;
    });
  }

  async updateOutboundStatus(
    actorUserId: string,
    id: string,
    status: OutboundStatus,
    scope?: DriverOperationScope,
  ) {
    return this.updateOperationalStatus(
      actorUserId,
      id,
      'outboundStatus',
      status,
      'PATIENT_TRIP_OUTBOUND_STATUS_CHANGED',
      scope,
    );
  }

  async updateReturnStatus(
    actorUserId: string,
    id: string,
    dto: UpdateReturnStatusDto & { contactAttempt?: string },
    scope?: DriverOperationScope,
  ) {
    const absent =
      dto.status === ReturnStatus.NOT_RETURNING ||
      dto.status === ReturnStatus.NO_SHOW;
    const reason = dto.reason?.trim();
    if (absent && !reason)
      throw new BadRequestException(
        'Motivo é obrigatório para registrar ausência no retorno',
      );
    if (!absent && dto.reason !== undefined)
      throw new BadRequestException(
        'Motivo de ausência só é aceito com NOT_RETURNING ou NO_SHOW',
      );
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      const current = await this.findOrThrow(id, tx, scope);
      if (current.cancelledAt) throw new ConflictException('Participação cancelada não pode ser alterada');
      if (scope) {
        this.assertDriverPhase(current.trip, 'RETURN', dto.status === ReturnStatus.NOT_RETURNING);
        if (dto.status === ReturnStatus.EXPECTED) throw new BadRequestException('Selecione uma situação operacional do retorno');
        if (dto.status === ReturnStatus.NO_SHOW && !dto.contactAttempt?.trim()) throw new BadRequestException('Registre a tentativa de contato e a justificativa da ausência');
      }
      if (
        dto.status !== ReturnStatus.NOT_RETURNING &&
        dto.status !== ReturnStatus.NO_SHOW &&
        current.outboundStatus !== OutboundStatus.BOARDED
      ) {
        throw new ConflictException(
          'O retorno só pode ser registrado para paciente que utilizou a ida',
        );
      }
      const now = new Date();
      if (scope && dto.status === ReturnStatus.NO_SHOW) {
        await tx.tripObservation.create({ data: { tripId: current.tripId, patientTripId: id, authorId: actorUserId, type: 'CONTACT_ATTEMPT', description: dto.contactAttempt!.trim() } });
        await tx.tripObservation.create({ data: { tripId: current.tripId, patientTripId: id, authorId: actorUserId, type: 'INCIDENT', description: reason! } });
      }
      const updated = await tx.patientTrip.update({
        where: { id },
        data: {
          returnStatus: dto.status,
          returnAbsenceReason: absent ? reason : null,
          returnAbsenceReportedAt: absent ? now : null,
          returnAbsenceReportedByUserId: absent ? actorUserId : null,
        },
        select: patientTripSelect,
      });
      await this.audit.record(tx, {
        actorUserId,
        action: 'PATIENT_TRIP_RETURN_STATUS_CHANGED',
        entityType: 'PatientTrip',
        entityId: id,
        reason: dto.reason?.trim(),
        changes: { before: current.returnStatus, after: dto.status, contactAttemptRecorded: !!scope && dto.status === ReturnStatus.NO_SHOW },
      });
      return updated;
    });
  }

  private async updateOperationalStatus(
    actorUserId: string,
    id: string,
    field: 'outboundStatus',
    status: OutboundStatus,
    action: string,
    scope?: DriverOperationScope,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      const current = await this.findOrThrow(id, tx, scope);
      if (current.cancelledAt) throw new ConflictException('Participação cancelada não pode ser alterada');
      if (scope) {
        this.assertDriverPhase(current.trip, 'OUTBOUND');
        if (status === OutboundStatus.PLANNED) throw new BadRequestException('Selecione embarque ou ausência na ida');
      }
      if (status !== OutboundStatus.BOARDED && current.returnStatus === ReturnStatus.RETURNED) throw new ConflictException('Não é possível desfazer a ida de quem já utilizou o retorno');
      const updated = await tx.patientTrip.update({
        where: { id },
        data: { [field]: status },
        select: patientTripSelect,
      });
      await this.audit.record(tx, {
        actorUserId,
        action,
        entityType: 'PatientTrip',
        entityId: id,
        changes: { before: current[field], after: status },
      });
      return updated;
    });
  }

  private async findTripOrThrow(
    tripId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const trip = await client.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        status: true,
        vehicle: { select: { capacity: true } },
        _count: { select: { patientTrips: true } },
        patientTrips: { select: { _count: { select: { companions: { where: { removedAt: null } } } } } },
      },
    });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    return trip;
  }

  private async findOrThrow(
    id: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
    scope?: DriverOperationScope,
  ) {
    const item = await client.patientTrip.findUnique({
      where: { id, ...(scope && { tripId: scope.tripId, trip: { driver: assignedDriver(scope.userId) } }) },
      select: {
        cancelledAt: true,
        tripId: true,
        id: true,
        priority: true,
        confirmationStatus: true,
        outboundStatus: true,
        returnStatus: true,
        trip: { select: { status: true, actualReturnStartAt: true } },
      },
    });
    if (!item) throw new NotFoundException('Participação não encontrada');
    return item;
  }

  private assertDriverPhase(trip: { status: TripStatus; actualReturnStartAt: Date | null }, direction: 'OUTBOUND' | 'RETURN', priorNotice = false) {
    if (trip.status !== TripStatus.IN_PROGRESS) throw new ConflictException('Registros operacionais exigem viagem em andamento');
    if (direction === 'OUTBOUND' && trip.actualReturnStartAt) throw new ConflictException('A etapa de ida já foi encerrada');
    if (direction === 'RETURN' && !priorNotice && !trip.actualReturnStartAt) throw new ConflictException('Registre o início do retorno antes do embarque ou ausência no retorno');
  }
}
