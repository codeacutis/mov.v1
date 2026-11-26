import { Prisma } from '../generated/prisma/client';

/** Serializa alterações que afetam agenda ou lotação, inclusive entre instâncias. */
export async function lockOperationalIntegrity(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('mov:operational-integrity', 0))`;
}

/** Conta passageiros e acompanhantes, sem incluir o motorista. */
export async function tripOccupancy(
  tx: Prisma.TransactionClient,
  tripId: string,
) {
  const patients = await tx.patientTrip.count({ where: { tripId, cancelledAt: null } });
  const companions = await tx.tripCompanion.count({
    where: { removedAt: null, patientTrip: { tripId, cancelledAt: null } },
  });
  return patients + companions;
}
