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
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
@Roles(Role.ADMIN)
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  list() {
    return this.vehicles.list();
  }

  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateVehicleDto) {
    return this.vehicles.create(actor.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehicles.update(actor.id, id, dto);
  }

  @Patch(':id/inactivate')
  inactivate(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.vehicles.inactivate(actor.id, id);
  }
}