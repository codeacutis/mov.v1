import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

export interface DriverOperationScope {
  tripId: string;
  userId: string;
}

export const assignedDriver = (userId: string) => ({
  userId,
  isActive: true,
  user: { isActive: true },
});

/** Called inside the same locked transaction as the mutation. */
export async function findOperationalTrip(
  tx: Prisma.TransactionClient,
  id: string,
  driverUserId?: string,
) {
  const trip = driverUserId
    ? await tx.trip.findFirst({
        where: { id, driver: assignedDriver(driverUserId) },
      })
    : await tx.trip.findUnique({ where: { id } });
  if (!trip) throw new NotFoundException('Viagem não encontrada');
  return trip;
}
