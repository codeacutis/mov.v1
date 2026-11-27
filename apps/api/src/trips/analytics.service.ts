import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Period = { start: Date; end: Date };

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard({ start, end }: Period) {
    const [trips, vehicles] = await Promise.all([
      this.prisma.trip.findMany({
        where: { plannedDepartureAt: { gte: start, lt: end } },
        select: {
          id: true, status: true, plannedDepartureAt: true,
          vehicle: { select: { id: true, plate: true, capacity: true } },
          patientTrips: { where: { cancelledAt: null }, select: {
            appointmentMunicipality: true, outboundStatus: true,
            _count: { select: { companions: { where: { removedAt: null } } } },
          } },
        },
      }),
      this.prisma.vehicle.findMany({ select: { id: true, plate: true, status: true } }),
    ]);
    const municipalities = new Map<string, number>();
    const months = new Map<string, number>();
    const usage = new Map<string, { plate: string; viagens: number; lugares: number; capacidade: number }>();
    let seats = 0, capacity = 0, boarded = 0;
    for (const trip of trips) {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(trip.plannedDepartureAt);
      const month = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}`;
      months.set(month, (months.get(month) ?? 0) + 1);
      const destinations = new Set(trip.patientTrips.map(p => p.appointmentMunicipality?.trim()).filter((v): v is string => !!v));
      for (const city of destinations) municipalities.set(city, (municipalities.get(city) ?? 0) + 1);
      if (trip.status === 'CANCELLED') continue;
      const planned = trip.patientTrips.reduce((sum, p) => sum + 1 + p._count.companions, 0);
      seats += planned;
      capacity += trip.vehicle.capacity;
      boarded += trip.patientTrips.filter(p => p.outboundStatus === 'BOARDED').length;
      const item = usage.get(trip.vehicle.id) ?? { plate: trip.vehicle.plate, viagens: 0, lugares: 0, capacidade: 0 };
      item.viagens++; item.lugares += planned; item.capacidade += trip.vehicle.capacity;
      usage.set(trip.vehicle.id, item);
    }
    return {
      total: trips.length,
      scheduled: trips.filter(t => t.status === 'SCHEDULED').length,
      inProgress: trips.filter(t => t.status === 'IN_PROGRESS').length,
      completed: trips.filter(t => t.status === 'COMPLETED').length,
      cancelled: trips.filter(t => t.status === 'CANCELLED').length,
      activeVehicles: vehicles.filter(v => v.status === 'ACTIVE').length,
      totalVehicles: vehicles.length,
      plannedSeats: seats, capacity, boardedPatients: boarded,
      occupancy: capacity ? Math.round(seats / capacity * 1000) / 10 : null,
      municipalities: [...municipalities].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
      months: [...months].map(([month, total]) => ({ month, total })).sort((a, b) => a.month.localeCompare(b.month)),
      vehicles: [...usage.values()].sort((a, b) => b.viagens - a.viagens),
    };
  }

  async agenda({ start, end }: Period) {
    const [trips, vehicles] = await Promise.all([
      this.prisma.trip.findMany({
        where: { plannedDepartureAt: { gte: start, lt: end } },
        select: { id: true, plannedDepartureAt: true, plannedReturnStartAt: true, municipalPickupPoint: true, status: true,
          vehicle: { select: { id: true, plate: true, description: true } }, driver: { select: { user: { select: { name: true } } } },
          _count: { select: { patientTrips: { where: { cancelledAt: null } } } },
        }, orderBy: { plannedDepartureAt: 'asc' },
      }),
      this.prisma.vehicle.findMany({ select: { id: true, plate: true, description: true, status: true }, orderBy: { plate: 'asc' } }),
    ]);
    return { trips, vehicles };
  }
}
