import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { lockOperationalIntegrity } from '../common/operational-integrity';
import { TripsService } from '../trips/trips.service';
import { PatientTripsService } from '../trips/patient-trips.service';
import { assignedDriver } from '../trips/driver-operation-scope';
import { OutboundStatus } from '../generated/prisma/client';
import {
  DriverObservationDto,
  DriverReturnStatusDto,
} from './driver-operation.dto';

/**
 * Visão do MOTORISTA (RN-12, D-011): só o necessário à execução do transporte.
 * Nunca selecionar CPF, Cartão SUS, endereço/data de nascimento do paciente,
 * observações, prioridade/justificativa nem status de confirmação.
 */
const summarySelect = {
  id: true,
  status: true,
  municipalPickupPoint: true,
  plannedDepartureAt: true,
  plannedReturnStartAt: true,
  actualDepartureAt: true,
  actualReturnStartAt: true,
  actualReturnAt: true,
  vehicle: { select: { plate: true, description: true, capacity: true } },
  _count: { select: { patientTrips: { where: { cancelledAt: null } } } },
} satisfies Prisma.TripSelect;

const detailSelect = {
  ...summarySelect,
  routeApprovedAt: true,
  stops: {
    orderBy: [{ direction: 'asc' }, { sequence: 'asc' }],
    select: {
      id: true,
      direction: true,
      sequence: true,
      name: true,
      address: true,
      municipality: true,
      stopType: true,
      plannedArrivalAt: true,
    },
  },
  patientTrips: {
    where: { cancelledAt: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      appointmentLocationName: true,
      appointmentAddress: true,
      appointmentMunicipality: true,
      appointmentAt: true,
      outboundStatus: true,
      returnStatus: true,
      outboundStopId: true,
      returnStopId: true,
      patient: {
        select: {
          name: true,
          phone: true,
          usesWheelchair: true,
          hasReducedMobility: true,
          needsBoardingAssistance: true,
        },
      },
      companions: {
        where: { removedAt: null },
        select: { name: true, phone: true },
      },
    },
  },
} satisfies Prisma.TripSelect;

@Injectable()
export class DriverTripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly participants: PatientTripsService,
  ) {}

  /** Somente viagens atribuídas ao usuário autenticado. */
  list(userId: string) {
    return this.prisma.trip.findMany({
      where: { driver: assignedDriver(userId) },
      select: summarySelect,
      orderBy: { plannedDepartureAt: 'asc' },
    });
  }

  async get(userId: string, tripId: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      // A posse da viagem entra no próprio WHERE: viagem de outro motorista é
      // indistinguível de inexistente (404), sem revelar que ela existe.
      const trip = await tx.trip.findFirst({
        where: { id: tripId, driver: assignedDriver(userId) },
        select: detailSelect,
      });
      if (!trip) throw new NotFoundException('Viagem não encontrada');

      // RN-07: o motorista consulta a rota APROVADA; antes disso não há paradas.
      if (!trip.routeApprovedAt)
        return {
          ...trip,
          stops: [],
          patientTrips: trip.patientTrips.map((p) => ({
            ...p,
            outboundStopId: null,
            returnStopId: null,
          })),
        };
      return {
        ...trip,
        stops: [...trip.stops].sort((a, b) =>
          a.direction === b.direction
            ? a.direction === 'RETURN'
              ? b.sequence - a.sequence
              : a.sequence - b.sequence
            : a.direction === 'OUTBOUND'
              ? -1
              : 1,
        ),
      };
    });
  }

  async start(userId: string, tripId: string) {
    await this.trips.start(userId, tripId, userId);
  }
  async startReturn(userId: string, tripId: string) {
    await this.trips.startReturn(userId, tripId, userId);
  }
  async complete(userId: string, tripId: string) {
    await this.trips.complete(userId, tripId, userId);
  }
  async outbound(
    userId: string,
    tripId: string,
    participationId: string,
    status: OutboundStatus,
  ) {
    await this.participants.updateOutboundStatus(
      userId,
      participationId,
      status,
      { tripId, userId },
    );
  }
  async returning(
    userId: string,
    tripId: string,
    participationId: string,
    dto: DriverReturnStatusDto,
  ) {
    await this.participants.updateReturnStatus(userId, participationId, dto, {
      tripId,
      userId,
    });
  }
  async observation(userId: string, tripId: string, dto: DriverObservationDto) {
    await this.trips.addObservation(
      userId,
      tripId,
      dto.description,
      userId,
      dto,
    );
  }
}
