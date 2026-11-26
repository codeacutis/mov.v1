import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { PageQueryDto } from '../common/page-query.dto';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import { CreateTripDto } from './dto/create-trip.dto';
import { InterruptTripDto, UpdateTripDto } from './dto/update-trip.dto';
import { TripsService } from './trips.service';

class CancelTripDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
class TripObservationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  description!: string;
}

@Controller('trips')
@Roles(Role.ADMIN)
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  list(@Query() query: PageQueryDto) {
    return this.trips.list(query.q, query.page, query.limit);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.trips.get(id);
  }

  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateTripDto) {
    return this.trips.create(actor.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.trips.update(actor.id, id, dto);
  }

  @Patch(':id/start')
  @HttpCode(200)
  start(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.trips.start(actor.id, id);
  }

  @Patch(':id/complete')
  @HttpCode(200)
  complete(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.trips.complete(actor.id, id);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CancelTripDto,
  ) {
    return this.trips.cancel(actor.id, id, dto.reason);
  }

  @Patch(':id/interrupt')
  interrupt(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: InterruptTripDto,
  ) {
    return this.trips.interrupt(actor.id, id, dto);
  }

  @Patch(':id/approve-route')
  @HttpCode(200)
  approveRoute(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.trips.approveRoute(actor.id, id);
  }

  @Post(':id/observations')
  addObservation(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: TripObservationDto,
  ) {
    return this.trips.addObservation(actor.id, id, dto.description);
  }
}
