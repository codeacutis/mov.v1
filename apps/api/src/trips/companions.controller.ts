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
import { CurrentUser, Roles } from '../auth/decorators';
import { AuthUser } from '../auth/auth.types';
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
    @CurrentUser() actor: AuthUser,
    @Param('patientTripId', new ParseUUIDPipe()) patientTripId: string,
    @Body() dto: CreateCompanionDto,
  ) {
    return this.companions.create(patientTripId, dto, actor.id);
  }

  @Patch(':companionId')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('patientTripId', new ParseUUIDPipe()) patientTripId: string,
    @Param('companionId', new ParseUUIDPipe()) companionId: string,
    @Body() dto: UpdateCompanionDto,
  ) {
    return this.companions.update(patientTripId, companionId, dto, actor.id);
  }

  @Delete(':companionId')
  @HttpCode(204)
  remove(
    @CurrentUser() actor: AuthUser,
    @Param('patientTripId', new ParseUUIDPipe()) patientTripId: string,
    @Param('companionId', new ParseUUIDPipe()) companionId: string,
  ) {
    return this.companions.remove(patientTripId, companionId, actor.id);
  }
}
