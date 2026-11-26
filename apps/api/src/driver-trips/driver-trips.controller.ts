import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  HttpCode,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import { DriverTripsService } from './driver-trips.service';
import { UpdateOutboundStatusDto } from '../trips/dto/patient-trip.dto';
import {
  DriverObservationDto,
  DriverReturnStatusDto,
} from './driver-operation.dto';

/** Rotas exclusivas do MOTORISTA. O ADMIN usa /trips. */
@Controller('driver/trips')
@Roles(Role.MOTORISTA)
export class DriverTripsController {
  constructor(private readonly driverTrips: DriverTripsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.driverTrips.list(user.id);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.driverTrips.get(user.id, id);
  }

  @Patch(':id/start')
  @HttpCode(204)
  start(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.driverTrips.start(user.id, id);
  }

  @Patch(':id/start-return')
  @HttpCode(204)
  startReturn(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.driverTrips.startReturn(user.id, id);
  }

  @Patch(':id/complete')
  @HttpCode(204)
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.driverTrips.complete(user.id, id);
  }

  @Patch(':id/participants/:participationId/outbound-status')
  @HttpCode(204)
  outbound(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('participationId', new ParseUUIDPipe()) participationId: string,
    @Body() dto: UpdateOutboundStatusDto,
  ) {
    return this.driverTrips.outbound(user.id, id, participationId, dto.status);
  }

  @Patch(':id/participants/:participationId/return-status')
  @HttpCode(204)
  returning(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('participationId', new ParseUUIDPipe()) participationId: string,
    @Body() dto: DriverReturnStatusDto,
  ) {
    return this.driverTrips.returning(user.id, id, participationId, dto);
  }

  @Post(':id/observations')
  @HttpCode(204)
  observation(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DriverObservationDto,
  ) {
    return this.driverTrips.observation(user.id, id, dto);
  }
}
