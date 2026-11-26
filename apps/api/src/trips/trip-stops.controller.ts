import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import {
  CreateTripStopDto,
  ReorderTripStopsDto,
} from './dto/create-trip-stop.dto';
import { TripStopsService } from './trip-stops.service';

@Controller('trips/:tripId/stops')
@Roles(Role.ADMIN)
export class TripStopsController {
  constructor(private readonly stops: TripStopsService) {}

  @Get()
  list(@Param('tripId', new ParseUUIDPipe()) tripId: string) {
    return this.stops.listByTrip(tripId);
  }

  @Post()
  create(
    @CurrentUser() actor: AuthUser,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: CreateTripStopDto,
  ) {
    return this.stops.create(actor.id, tripId, dto);
  }

  @Patch('reorder')
  reorder(
    @CurrentUser() actor: AuthUser,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: ReorderTripStopsDto,
  ) {
    return this.stops.reorder(actor.id, tripId, dto.direction, dto.stopIds);
  }

  @Post('rebuild-return')
  rebuildReturn(
    @CurrentUser() actor: AuthUser,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
  ) {
    return this.stops.rebuildReturn(actor.id, tripId);
  }

  @Patch(':stopId')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Param('stopId', new ParseUUIDPipe()) stopId: string,
    @Body() dto: CreateTripStopDto,
  ) {
    return this.stops.update(actor.id, tripId, stopId, dto);
  }

  @Delete(':stopId')
  @HttpCode(204)
  remove(
    @CurrentUser() actor: AuthUser,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Param('stopId', new ParseUUIDPipe()) stopId: string,
  ) {
    return this.stops.remove(actor.id, tripId, stopId);
  }
}
