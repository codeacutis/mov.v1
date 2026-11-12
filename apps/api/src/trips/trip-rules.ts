/**
 * Regras puras de agendamento (sem acesso a banco), para teste unitário.
 */

export const ACTIVE_TRIP_STATUSES = ['SCHEDULED', 'IN_PROGRESS'] as const;

export interface PlannedTimes {
  plannedDepartureAt: Date;
  plannedReturnStartAt: Date;
  plannedReturnEndAt: Date;
}

/** Saída < início do retorno < fim do retorno (espelha o CHECK do banco). */
export function hasValidScheduleOrder(t: PlannedTimes): boolean {
  return (
    t.plannedDepartureAt < t.plannedReturnStartAt &&
    t.plannedReturnStartAt < t.plannedReturnEndAt
  );
}

/** Intervalos semiabertos [início, fim): encostar nas pontas não é conflito. */
export function intervalsOverlap(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date },
): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Passageiros = pacientes + acompanhantes. O motorista não conta (RN-11). */
export function computeOccupancy(
  patientCount: number,
  companionCount: number,
): number {
  return patientCount + companionCount;
}

export function fitsCapacity(
  capacity: number,
  occupied: number,
  adding: number,
): boolean {
  return occupied + adding <= capacity;
}

export type OverlapResource = 'DRIVER' | 'VEHICLE';

/**
 * Identifica violação das constraints de exclusão de agenda (SQLSTATE 23P01),
 * percorrendo a cadeia de causas porque o Prisma/adapters embrulham o erro.
 */
export function detectOverlapViolation(err: unknown): OverlapResource | null {
  const seen = new Set<unknown>();
  let current: unknown = err;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const e = current as {
      message?: unknown;
      code?: unknown;
      cause?: unknown;
      meta?: unknown;
    };
    const haystack = `${String(e.message ?? '')} ${JSON.stringify(e.meta ?? '')}`;
    if (haystack.includes('trips_driver_no_overlap_excl')) return 'DRIVER';
    if (haystack.includes('trips_vehicle_no_overlap_excl')) return 'VEHICLE';
    current = e.cause;
  }
  return null;
}
