import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TripStatus, StopType } from '../generated/prisma/client';

export async function assertRouteEditable(
  tx: Prisma.TransactionClient,
  tripId: string,
) {
  const trip = await tx.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new NotFoundException('Viagem não encontrada');
  if (trip.status !== TripStatus.SCHEDULED)
    throw new ConflictException(
      'A rota só pode ser alterada ou aprovada antes do início da viagem',
    );
  return trip;
}

export async function invalidateRoute(
  tx: Prisma.TransactionClient,
  tripId: string,
) {
  await tx.trip.update({
    where: { id: tripId },
    data: { routeApprovedAt: null, routeApprovedByUserId: null },
  });
}

export function reverseStopType(type: StopType): StopType {
  return type === 'MUNICIPAL_PICKUP'
    ? 'MUNICIPAL_RETURN'
    : type === 'MUNICIPAL_RETURN'
      ? 'MUNICIPAL_PICKUP'
      : type;
}

/** Same sequence key in both directions; RETURN is traversed in descending order. */
export async function assertRouteComplete(
  tx: Prisma.TransactionClient,
  tripId: string,
) {
  const stops = await tx.tripStop.findMany({
    where: { tripId },
    orderBy: { sequence: 'asc' },
  });
  const outbound = stops.filter((s) => s.direction === 'OUTBOUND');
  const returning = stops.filter((s) => s.direction === 'RETURN');
  if (!outbound.length || outbound.length !== returning.length)
    throw new BadRequestException(
      'Revise a ida e gere o retorno inverso antes de aprovar',
    );
  for (const [index, stop] of outbound.entries()) {
    const back = returning[index];
    if (
      stop.sequence !== back.sequence ||
      stop.name !== back.name ||
      stop.address !== back.address ||
      stop.municipality !== back.municipality ||
      reverseStopType(stop.stopType) !== back.stopType
    ) {
      throw new BadRequestException(
        'O retorno deve corresponder à ordem inversa da ida. Gere novamente o retorno e revise a rota',
      );
    }
  }
  const patients = await tx.patientTrip.findMany({
    where: { tripId, cancelledAt: null },
    select: { outboundStopId: true, returnStopId: true },
  });
  if (
    patients.some((p) => {
      const index = outbound.findIndex(
        (s) => s.id === p.outboundStopId && s.stopType === 'APPOINTMENT',
      );
      return index < 0 || returning[index].id !== p.returnStopId;
    })
  )
    throw new BadRequestException(
      'Associe todos os participantes ativos ao desembarque na ida e ao embarque correspondente no retorno',
    );
}
