import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import type { TripReportQuery } from './reports.controller';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}
  async trips(query: TripReportQuery) {
    const trips = await this.prisma.trip.findMany({
      where: {
        plannedDepartureAt: { gte: new Date(query.start), lt: new Date(query.end) },
        ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
        ...(query.driverId ? { driverId: query.driverId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.municipality?.trim() ? { patientTrips: { some: { cancelledAt: null, appointmentMunicipality: { contains: query.municipality.trim(), mode: 'insensitive' as const } } } } : {}),
      },
      select: {
        id: true, status: true, plannedDepartureAt: true, plannedReturnStartAt: true,
        actualDepartureAt: true, actualReturnStartAt: true, actualReturnAt: true,
        vehicle: { select: { plate: true, capacity: true } },
        driver: { select: { user: { select: { name: true } } } },
        patientTrips: { where: { cancelledAt: null }, select: { appointmentMunicipality: true, _count: { select: { companions: { where: { removedAt: null } } } } } },
      }, orderBy: [{ plannedDepartureAt: 'asc' }, { id: 'asc' }],
    });
    return trips.map(t => {
      const patients = t.patientTrips.length;
      const companions = t.patientTrips.reduce((sum, p) => sum + p._count.companions, 0);
      return { id: t.id, status: t.status, plannedDepartureAt: t.plannedDepartureAt, plannedReturnStartAt: t.plannedReturnStartAt,
        actualDepartureAt: t.actualDepartureAt, actualReturnStartAt: t.actualReturnStartAt, actualReturnAt: t.actualReturnAt,
        plate: t.vehicle.plate, driver: t.driver.user.name, capacity: t.vehicle.capacity, patients, companions,
        occupancy: t.vehicle.capacity ? Math.round((patients + companions) / t.vehicle.capacity * 1000) / 10 : null,
        municipalities: [...new Set(t.patientTrips.map(p => p.appointmentMunicipality?.trim()).filter((m): m is string => !!m))].sort(),
      };
    });
  }
  async excel(query: TripReportQuery) {
    const records = await this.trips(query);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Viagens');
    sheet.columns = [
      { header: 'Saída planejada', key: 'plannedDepartureAt', width: 23 }, { header: 'Retorno planejado', key: 'plannedReturnStartAt', width: 23 },
      { header: 'Saída real', key: 'actualDepartureAt', width: 23 }, { header: 'Início retorno real', key: 'actualReturnStartAt', width: 23 },
      { header: 'Chegada real', key: 'actualReturnAt', width: 23 }, { header: 'Municípios', key: 'municipalities', width: 35 },
      { header: 'Veículo', key: 'plate', width: 16 }, { header: 'Motorista', key: 'driver', width: 30 },
      { header: 'Situação', key: 'status', width: 18 }, { header: 'Pacientes', key: 'patients', width: 13 },
      { header: 'Acompanhantes', key: 'companions', width: 16 }, { header: 'Capacidade', key: 'capacity', width: 14 },
      { header: 'Ocupação planejada (%)', key: 'occupancy', width: 24 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'M1' };
    const date = (v: Date | null) => v ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(v) : '';
    const labels: Record<string, string> = { SCHEDULED: 'Agendada', IN_PROGRESS: 'Em andamento', COMPLETED: 'Conclu?da', CANCELLED: 'Cancelada', INTERRUPTED: 'Interrompida' };
    for (const r of records) sheet.addRow({ ...r, status: labels[r.status] ?? r.status, municipalities: r.municipalities.join(', '), plannedDepartureAt: date(r.plannedDepartureAt), plannedReturnStartAt: date(r.plannedReturnStartAt), actualDepartureAt: date(r.actualDepartureAt), actualReturnStartAt: date(r.actualReturnStartAt), actualReturnAt: date(r.actualReturnAt) });
    // ExcelJS writes JavaScript strings as string cells, never as formula objects.
    return workbook.xlsx.writeBuffer();
  }
}
