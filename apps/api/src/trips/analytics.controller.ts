import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { IsISO8601 } from 'class-validator';
import { Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import { AnalyticsService } from './analytics.service';

class PeriodDto {
  @IsISO8601({ strict: true }) start!: string;
  @IsISO8601({ strict: true }) end!: string;
}

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

  @Get('dashboard')
  dashboard(@Query() query: PeriodDto) { return this.analytics.dashboard(this.period(query)); }

  @Get('agenda')
  agenda(@Query() query: PeriodDto) { return this.analytics.agenda(this.period(query)); }
}
