import {
  computeOccupancy,
  detectOverlapViolation,
  fitsCapacity,
  hasValidScheduleOrder,
  intervalsOverlap,
} from './trip-rules';

const d = (s: string) => new Date(s);

describe('trip-rules', () => {
  describe('hasValidScheduleOrder', () => {
    const base = {
      plannedDepartureAt: d('2026-12-01T09:00:00Z'),
      plannedReturnStartAt: d('2026-12-01T15:00:00Z'),
      plannedReturnEndAt: d('2026-12-01T19:00:00Z'),
    };
    it('aceita saída < início do retorno < fim', () => {
      expect(hasValidScheduleOrder(base)).toBe(true);
    });
    it('rejeita retorno antes da saída', () => {
      expect(
        hasValidScheduleOrder({
          ...base,
          plannedReturnStartAt: d('2026-12-01T08:00:00Z'),
        }),
      ).toBe(false);
    });
    it('rejeita fim igual ao início do retorno', () => {
      expect(
        hasValidScheduleOrder({
          ...base,
          plannedReturnEndAt: base.plannedReturnStartAt,
        }),
      ).toBe(false);
    });
  });

  describe('intervalsOverlap', () => {
    const a = {
      start: d('2026-12-01T09:00:00Z'),
      end: d('2026-12-01T19:00:00Z'),
    };
    it('detecta sobreposição parcial', () => {
      expect(
        intervalsOverlap(a, {
          start: d('2026-12-01T18:00:00Z'),
          end: d('2026-12-01T22:00:00Z'),
        }),
      ).toBe(true);
    });
    it('intervalos que apenas encostam não conflitam', () => {
      expect(
        intervalsOverlap(a, {
          start: d('2026-12-01T19:00:00Z'),
          end: d('2026-12-01T22:00:00Z'),
        }),
      ).toBe(false);
    });
  });

  describe('capacidade', () => {
    it('soma pacientes e acompanhantes, sem contar o motorista', () => {
      expect(computeOccupancy(3, 2)).toBe(5);
    });
    it('permite preencher exatamente a capacidade', () => {
      expect(fitsCapacity(4, 3, 1)).toBe(true);
    });
    it('rejeita exceder a capacidade', () => {
      expect(fitsCapacity(4, 4, 1)).toBe(false);
    });
  });

  describe('detectOverlapViolation', () => {
    it('identifica motorista, mesmo aninhado em cause', () => {
      const err = {
        message: 'wrapper',
        cause: {
          message:
            'conflicting key value violates exclusion constraint "trips_driver_no_overlap_excl"',
        },
      };
      expect(detectOverlapViolation(err)).toBe('DRIVER');
    });
    it('identifica veículo via meta', () => {
      expect(
        detectOverlapViolation({
          message: 'x',
          meta: { constraint: 'trips_vehicle_no_overlap_excl' },
        }),
      ).toBe('VEHICLE');
    });
    it('ignora erros não relacionados', () => {
      expect(detectOverlapViolation(new Error('outro erro'))).toBeNull();
      expect(detectOverlapViolation(null)).toBeNull();
    });
  });
});
