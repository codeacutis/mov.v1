import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators';
import { AuthUser } from '../auth/auth.types';
import { Role } from '../generated/prisma/client';
import {
  CancelPatientTripDto,
  CreatePatientTripDto,
  UpdateOutboundStatusDto,
  UpdatePatientTripDto,
  UpdateReturnStatusDto,
} from './dto/patient-trip.dto';
import { PatientTripsService } from './patient-trips.service';

@Controller()
@Roles(Role.ADMIN)
export class PatientTripsController {
  constructor(private readonly patientTrips: PatientTripsService) {}

  @Get('trips/:tripId/patient-trips')
  list(@Param('tripId', new ParseUUIDPipe()) tripId: string) {
    return this.patientTrips.list(tripId);
  }

  @Post('trips/:tripId/patient-trips')
  create(
    @CurrentUser() actor: AuthUser,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: CreatePatientTripDto,
  ) {
    return this.patientTrips.create(actor.id, tripId, dto);
  }

  @Patch('patient-trips/:id/cancel')
  cancel(@CurrentUser() actor: AuthUser, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: CancelPatientTripDto) {
    return this.patientTrips.cancel(actor.id, id, dto.reason);
  }

  @Patch('patient-trips/:id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePatientTripDto,
  ) {
    return this.patientTrips.update(actor.id, id, dto);
  }

  @Patch('patient-trips/:id/outbound-status')
  updateOutbound(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOutboundStatusDto,
  ) {
    return this.patientTrips.updateOutboundStatus(actor.id, id, dto.status);
  }

  @Patch('patient-trips/:id/return-status')
  updateReturn(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReturnStatusDto,
  ) {
    return this.patientTrips.updateReturnStatus(actor.id, id, dto);
  }
}
