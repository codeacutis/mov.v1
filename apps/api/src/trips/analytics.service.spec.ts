import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsService', () => {
  const start = new Date('2026-01-01T03:00:00Z');
  const end = new Date('2026-02-01T03:00:00Z');
  const trip = {
    id: 'trip', status: 'COMPLETED', plannedDepartureAt: new Date('2026-01-15T12:00:00Z'),
    vehicle: { id: 'vehicle', plate: 'ABC1D23', capacity: 4 },
    patientTrips: [
      { appointmentMunicipality: 'Cidade A', outboundStatus: 'BOARDED', _count: { companions: 1 } },
      { appointmentMunicipality: 'Cidade A', outboundStatus: 'NO_SHOW', _count: { companions: 0 } },
      { appointmentMunicipality: 'Cidade B', outboundStatus: 'PLANNED', _count: { companions: 0 } },
    ],
  };
  const findTrips = jest.fn();
  const findVehicles = jest.fn();
  const service = new AnalyticsService({ trip: { findMany: findTrips }, vehicle: { findMany: findVehicles } } as unknown as PrismaService);
  beforeEach(() => {
    jest.clearAllMocks();
    findTrips.mockResolvedValue(Array.from({ length: 25 }, (_, i) => ({ ...trip, id: String(i) })));
    findVehicles.mockResolvedValue([{ id: 'vehicle', plate: 'ABC1D23', status: 'ACTIVE' }]);
  });
  it('agrega mais que uma página e conta municípios distintos por viagem', async () => {
    const result = await service.dashboard({ start, end });
    expect(result.total).toBe(25);
    expect(result.municipalities).toEqual([{ name: 'Cidade A', total: 25 }, { name: 'Cidade B', total: 25 }]);
    expect(result.months).toEqual([{ month: '2026-01', total: 25 }]);
    expect(result.plannedSeats).toBe(100);
    expect(result.occupancy).toBe(100);
    expect(result.boardedPatients).toBe(25);
    expect(findTrips).toHaveBeenCalledWith(expect.objectContaining({ where: { plannedDepartureAt: { gte: start, lt: end } } }));
    expect(findTrips.mock.calls[0][0]).not.toHaveProperty('take');
  });
  it('não inclui viagem cancelada na ocupação', async () => {
    findTrips.mockResolvedValue([{ ...trip, status: 'CANCELLED' }]);
    const result = await service.dashboard({ start, end });
    expect(result.total).toBe(1);
    expect(result.capacity).toBe(0);
    expect(result.occupancy).toBeNull();
  });
  it('retorna todas as viagens da semana sem paginação', async () => {
    const result = await service.agenda({ start, end });
    expect(result.trips).toHaveLength(25);
    expect(findTrips.mock.calls[0][0]).not.toHaveProperty('take');
  });
});
