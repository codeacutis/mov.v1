import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { IsISO8601, IsOptional, IsString, IsUUID, IsEnum, MaxLength } from 'class-validator';
import { Response } from 'express';
import { Roles } from '../auth/decorators';
import { Role, TripStatus } from '../generated/prisma/client';
import { ReportsService } from './reports.service';

export class TripReportQuery {
  @IsISO8601({ strict: true }) start!: string;
  @IsISO8601({ strict: true }) end!: string;
  @IsOptional() @IsString() @MaxLength(100) municipality?: string;
  @IsOptional() @IsUUID() vehicleId?: string;
  @IsOptional() @IsUUID() driverId?: string;
  @IsOptional() @IsEnum(TripStatus) status?: TripStatus;
}

@Controller('reports')
@Roles(Role.ADMIN)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  private validate(query: TripReportQuery) {
    if (new Date(query.start) >= new Date(query.end)) throw new BadRequestException('Período inválido.');
    return query;
  }
  @Get('trips')
  list(@Query() query: TripReportQuery) { return this.reports.trips(this.validate(query)); }
  @Get('trips.xlsx')
  async excel(@Query() query: TripReportQuery, @Res() response: Response) {
    const buffer = await this.reports.excel(this.validate(query));
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', 'attachment; filename="mov-viagens.xlsx"');
    response.send(Buffer.from(buffer));
  }
}
