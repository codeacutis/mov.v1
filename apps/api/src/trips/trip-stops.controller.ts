import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import { CreateTripStopDto } from './dto/create-trip-stop.dto';
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
