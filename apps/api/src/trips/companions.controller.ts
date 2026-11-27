import { ApiEndpoint } from '../documentation/api-endpoint';
import { ref, array } from '../documentation/response-schemas';
import { ApiTags, ApiParam } from '@nestjs/swagger';
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

@ApiTags('Acompanhantes')
@Controller('patient-trips/:patientTripId/companions')
@Roles(Role.ADMIN)
export class CompanionsController {
  constructor(private readonly companions: CompanionsService) {}

  @ApiEndpoint('Listar acompanhantes ativos da participação', {
    access: 'ADMIN',
    schema: array(ref('Companion')),
    errors: [404],
  })
  @ApiParam({
    name: 'patientTripId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Get()
  list(@Param('patientTripId', new ParseUUIDPipe()) patientTripId: string) {
    return this.companions.list(patientTripId);
  }

  @ApiEndpoint('Cadastrar acompanhante', {
    access: 'ADMIN',
    schema: ref('Companion'),
    status: 201,
    description:
      'Até um por participação ativa em viagem SCHEDULED. Nome/telefone obrigatórios; ocupa vaga.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'patientTripId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Post()
  create(
    @CurrentUser() actor: AuthUser,
    @Param('patientTripId', new ParseUUIDPipe()) patientTripId: string,
    @Body() dto: CreateCompanionDto,
  ) {
    return this.companions.create(patientTripId, dto, actor.id);
  }

  @ApiEndpoint('Editar acompanhante', {
    access: 'ADMIN',
    schema: ref('Companion'),
    description: 'Somente participação ativa em viagem SCHEDULED.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'patientTripId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @ApiParam({
    name: 'companionId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch(':companionId')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('patientTripId', new ParseUUIDPipe()) patientTripId: string,
    @Param('companionId', new ParseUUIDPipe()) companionId: string,
    @Body() dto: UpdateCompanionDto,
  ) {
    return this.companions.update(patientTripId, companionId, dto, actor.id);
  }

  @ApiEndpoint('Remover logicamente acompanhante', {
    access: 'ADMIN',
    status: 204,
    description: 'Preserva histórico e libera vaga; somente antes do início.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'patientTripId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @ApiParam({
    name: 'companionId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
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
