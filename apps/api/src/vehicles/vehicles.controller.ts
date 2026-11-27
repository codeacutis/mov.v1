import { ApiEndpoint } from '../documentation/api-endpoint';
import { ref, page } from '../documentation/response-schemas';
import { ApiTags, ApiParam } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PageQueryDto } from '../common/page-query.dto';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('Veículos')
@Controller('vehicles')
@Roles(Role.ADMIN)
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @ApiEndpoint('Listar veículos', {
    access: 'ADMIN',
    schema: page('Vehicle'),
    description:
      'Ordenação placa crescente; q busca placa ou descrição. Inclui registros históricos/inativos. Paginação com page/limit. Não há parâmetro de ordenação.',
  })
  @Get()
  list(@Query() query: PageQueryDto) {
    return this.vehicles.list(query.q, query.page, query.limit);
  }

  @ApiEndpoint('Cadastrar veículo', {
    access: 'ADMIN',
    schema: ref('Vehicle'),
    status: 201,
    description: 'Validação conforme DTO.',
    errors: [404, 409],
  })
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateVehicleDto) {
    return this.vehicles.create(actor.id, dto);
  }

  @ApiEndpoint('Editar veículo', {
    access: 'ADMIN',
    schema: ref('Vehicle'),
    description: 'Atualização parcial; campos omitidos são preservados.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch(':id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehicles.update(actor.id, id, dto);
  }

  @ApiEndpoint('Inativar veículo preservando histórico', {
    access: 'ADMIN',
    schema: ref('Vehicle'),
    description: 'Inativação lógica, sem exclusão do histórico.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch(':id/inactivate')
  inactivate(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.vehicles.inactivate(actor.id, id);
  }
}
