import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto';
import { PatientsService } from './patients.service';

@Controller('patients')
@Roles(Role.ADMIN)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  list() {
    return this.patients.list();
  }

  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreatePatientDto) {
    return this.patients.create(actor.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patients.update(actor.id, id, dto);
  }

  @Patch(':id/inactivate')
  inactivate(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.patients.inactivate(actor.id, id);
  }
}
