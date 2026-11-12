import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import {
  AddPatientDto,
  CancelTripDto,
  CompanionDto,
  CreateTripDto,
  ListTripsQueryDto,
  UpdatePatientTripDto,
  UpdateTripDto,
} from './dto/trip.dto';
import { TripsService } from './trips.service';

@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  // Leitura: ADMIN (visão completa) e MOTORISTA (somente viagens atribuídas).
  @Get()
  @Roles(Role.ADMIN, Role.MOTORISTA)
  list(@CurrentUser() user: AuthUser, @Query() query: ListTripsQueryDto) {
    return this.trips.list(user, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MOTORISTA)
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.trips.get(user, id);
  }

  // Escrita: somente ADMIN.
  @Post()
  @Roles(Role.ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTripDto) {
    return this.trips.create(user, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.trips.update(user, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Roles(Role.ADMIN)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelTripDto,
  ) {
    return this.trips.cancel(user, id, dto.reason);
  }

  @Post(':id/patients')
  @Roles(Role.ADMIN)
  addPatient(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPatientDto,
  ) {
    return this.trips.addPatient(user, id, dto);
  }

  @Patch(':id/patients/:patientTripId')
  @Roles(Role.ADMIN)
  updatePatientTrip(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('patientTripId', ParseUUIDPipe) patientTripId: string,
    @Body() dto: UpdatePatientTripDto,
  ) {
    return this.trips.updatePatientTrip(user, id, patientTripId, dto);
  }

  @Post(':id/patients/:patientTripId/companions')
  @Roles(Role.ADMIN)
  addCompanion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('patientTripId', ParseUUIDPipe) patientTripId: string,
    @Body() dto: CompanionDto,
  ) {
    return this.trips.addCompanion(user, id, patientTripId, dto);
  }

  @Delete(':id/patients/:patientTripId/companions/:companionId')
  @Roles(Role.ADMIN)
  removeCompanion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('patientTripId', ParseUUIDPipe) patientTripId: string,
    @Param('companionId', ParseUUIDPipe) companionId: string,
  ) {
    return this.trips.removeCompanion(user, id, patientTripId, companionId);
  }
}
