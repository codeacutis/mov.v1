import * as ExcelJS from 'exceljs';
import { Role, TripStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
const query = { start: '2026-01-01T03:00:00.000Z', end: '2026-02-01T03:00:00.000Z', municipality: 'Alfa', vehicleId: 'vehicle', driverId: 'driver', status: TripStatus.COMPLETED };
const trip = (index: number) => ({ id: String(index), status: TripStatus.COMPLETED, plannedDepartureAt: new Date('2026-01-02T10:00:00Z'), plannedReturnStartAt: new Date('2026-01-02T15:00:00Z'), actualDepartureAt: null, actualReturnStartAt: null, actualReturnAt: null, vehicle: { plate: '=1+1', capacity: 4 }, driver: { user: { name: '+Nome fictício' } }, patientTrips: [{ appointmentMunicipality: 'Alfa', _count: { companions: 1 } }, { appointmentMunicipality: 'Beta', _count: { companions: 0 } }] });
describe('Relatório de viagens', () => {
  const findMany = jest.fn();
  const service = new ReportsService({ trip: { findMany } } as unknown as PrismaService);
  beforeEach(() => { findMany.mockReset(); findMany.mockResolvedValue(Array.from({ length: 125 }, (_, i) => trip(i))); });
  it('consulta todos os registros com filtros e calcula a ocupação da viagem inteira', async () => {
    const rows = await service.trips(query);
    expect(rows).toHaveLength(125);
    expect(rows[0]).toMatchObject({ patients: 2, companions: 1, capacity: 4, occupancy: 75, municipalities: ['Alfa', 'Beta'] });
    const args = findMany.mock.calls[0][0] as { where: unknown; take?: number; skip?: number };
    expect(args.take).toBeUndefined(); expect(args.skip).toBeUndefined();
    expect(args.where).toMatchObject({ vehicleId: 'vehicle', driverId: 'driver', status: 'COMPLETED', patientTrips: { some: { cancelledAt: null, appointmentMunicipality: { contains: 'Alfa', mode: 'insensitive' } } } });
  });
  it('gera XLSX legível completo e armazena textos suspeitos como texto', async () => {
    const bytes = await service.excel(query);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);
    const sheet = workbook.getWorksheet('Viagens')!;
    expect(sheet.rowCount).toBe(126);
    expect(sheet.getCell('G2').value).toBe('=1+1');
    expect(sheet.getCell('H2').value).toBe('+Nome fictício');
    expect(sheet.getCell('J2').value).toBe(2);
    expect(sheet.getCell('M126').value).toBe(75);
  });
  it('restringe as rotas ao ADMIN', () => {
    const metadata = Reflect.getMetadataKeys(ReportsController).flatMap(k => [Reflect.getMetadata(k, ReportsController)]);
    expect(metadata).toContainEqual([Role.ADMIN]);
  });
});
