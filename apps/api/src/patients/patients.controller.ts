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
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto';
import { PatientsService } from './patients.service';

@ApiTags('Pacientes')
@Controller('patients')
@Roles(Role.ADMIN)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @ApiEndpoint('Listar pacientes', {
    access: 'ADMIN',
    schema: page('Patient'),
    description:
      'Ordenação nome crescente; q busca nome, cartão SUS ou telefone. Inclui registros históricos/inativos. Paginação com page/limit. Não há parâmetro de ordenação.',
  })
  @Get()
  list(@Query() query: PageQueryDto) {
    return this.patients.list(query.q, query.page, query.limit);
  }

  @ApiEndpoint('Cadastrar paciente', {
    access: 'ADMIN',
    schema: ref('Patient'),
    status: 201,
    description: 'Validação conforme DTO.',
    errors: [404, 409],
  })
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreatePatientDto) {
    return this.patients.create(actor.id, dto);
  }

  @ApiEndpoint('Editar paciente', {
    access: 'ADMIN',
    schema: ref('Patient'),
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
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patients.update(actor.id, id, dto);
  }

  @ApiEndpoint('Inativar paciente preservando histórico', {
    access: 'ADMIN',
    schema: ref('Patient'),
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
    return this.patients.inactivate(actor.id, id);
  }
}
