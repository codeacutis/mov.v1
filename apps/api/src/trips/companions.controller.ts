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
} from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import {
  CompanionsService,
  CreateCompanionDto,
  UpdateCompanionDto,
} from './companions.service';

@Controller('patient-trips/:patientTripId/companions')
@Roles(Role.ADMIN)
export class CompanionsController {
  constructor(private readonly companions: CompanionsService) {}

  @Get()
  list(@Param('patientTripId', new ParseUUIDPipe()) patientTripId: string) {
    return this.companions.list(patientTripId);
  }

  @Post()
  create(
    @Param('patientTripId', new ParseUUIDPipe()) patientTripId: string,
    @Body() dto: CreateCompanionDto,
  ) {
    return this.companions.create(patientTripId, dto);
  }

  @Patch(':companionId')
  update(
    @Param('patientTripId', new ParseUUIDPipe()) patientTripId: string,
    @Param('companionId', new ParseUUIDPipe()) companionId: string,
    @Body() dto: UpdateCompanionDto,
  ) {
    return this.companions.update(patientTripId, companionId, dto);
  }

  @Delete(':companionId')
  @HttpCode(204)
  remove(
    @Param('patientTripId', new ParseUUIDPipe()) patientTripId: string,
    @Param('companionId', new ParseUUIDPipe()) companionId: string,
  ) {
    return this.companions.remove(patientTripId, companionId);
  }
}
