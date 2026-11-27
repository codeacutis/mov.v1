import { ApiEndpoint } from '../documentation/api-endpoint';
import { ref, array } from '../documentation/response-schemas';
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiProduces,
} from '@nestjs/swagger';
import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Response } from 'express';
import { Roles } from '../auth/decorators';
import { Role, TripStatus } from '../generated/prisma/client';
import { ReportsService } from './reports.service';

export class TripReportQuery {
  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Início inclusivo do período, em ISO 8601 com fuso horário.',
  })
  @IsISO8601({ strict: true })
  start!: string;
  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Fim exclusivo do período, posterior a start.',
  })
  @IsISO8601({ strict: true })
  end!: string;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  municipality?: string;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  driverId?: string;
  @ApiPropertyOptional({ enum: TripStatus, nullable: true })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;
}

@ApiTags('Relatórios')
@Controller('reports')
@Roles(Role.ADMIN)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  private validate(query: TripReportQuery) {
    if (new Date(query.start) >= new Date(query.end))
      throw new BadRequestException('Período inválido.');
    return query;
  }
  @ApiEndpoint('Consultar relatório de viagens', {
    access: 'ADMIN',
    schema: array(ref('TripReport')),
    description:
      'start inclusivo e end exclusivo. Filtros opcionais combinados. Ordenação por saída e id crescentes. Sem paginação.',
  })
  @Get('trips')
  list(@Query() query: TripReportQuery) {
    return this.reports.trips(this.validate(query));
  }
  @ApiEndpoint('Exportar relatório em Excel', {
    access: 'ADMIN',
    schema: { type: 'string', format: 'binary' },
    description:
      'Mesmo período e filtros do relatório JSON. Arquivo mov-viagens.xlsx.',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Get('trips.xlsx')
  async excel(@Query() query: TripReportQuery, @Res() response: Response) {
    const buffer = await this.reports.excel(this.validate(query));
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="mov-viagens.xlsx"',
    );
    response.send(Buffer.from(buffer));
  }
}
