import { ApiEndpoint } from '../documentation/api-endpoint';
import { ref } from '../documentation/response-schemas';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { IsISO8601 } from 'class-validator';
import { Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import { AnalyticsService } from './analytics.service';

class PeriodDto {
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
}

@ApiTags('Dashboard')
@Controller('analytics')
@Roles(Role.ADMIN)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  private period(query: PeriodDto) {
    const start = new Date(query.start);
    const end = new Date(query.end);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      throw new BadRequestException('Período inválido.');
    }
    return { start, end };
  }

  @ApiEndpoint('Consultar indicadores no período', {
    access: 'ADMIN',
    schema: ref('Dashboard'),
    description:
      'Período obrigatório: start inclusivo e end exclusivo; start < end. Sem paginação.',
  })
  @Get('dashboard')
  dashboard(@Query() query: PeriodDto) {
    return this.analytics.dashboard(this.period(query));
  }

  @ApiEndpoint('Consultar agenda e frota', {
    access: 'ADMIN',
    schema: ref('Agenda'),
    description:
      'Período obrigatório: start inclusivo e end exclusivo. Ordenação por saída crescente; sem paginação.',
  })
  @Get('agenda')
  agenda(@Query() query: PeriodDto) {
    return this.analytics.agenda(this.period(query));
  }
}
