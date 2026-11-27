import { ApiEndpoint } from '../documentation/api-endpoint';
import { ref, array } from '../documentation/response-schemas';
import { ApiTags, ApiParam } from '@nestjs/swagger';
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
@ApiTags('Operações do motorista')
@Controller('driver/trips')
@Roles(Role.MOTORISTA)
export class DriverTripsController {
  constructor(private readonly driverTrips: DriverTripsService) {}

  @ApiEndpoint('Listar viagens atribuídas ao motorista', {
    access: 'MOTORISTA',
    schema: array(ref('DriverTripSummary')),
    description:
      'Lista sem paginação, ordenada por saída crescente; somente vínculo ativo.',
  })
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.driverTrips.list(user.id);
  }

  @ApiEndpoint('Consultar operação e rota aprovada', {
    access: 'MOTORISTA',
    schema: ref('DriverTripDetail'),
    description:
      'Paradas vazias e vínculos de parada nulos até aprovação. Ida crescente, retorno decrescente. Não retorna documentos, endereço residencial ou notas livres.',
    errors: [404],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.driverTrips.get(user.id, id);
  }

  @ApiEndpoint('Iniciar viagem atribuída', {
    access: 'MOTORISTA',
    status: 204,
    description:
      'Somente SCHEDULED com rota aprovada; instante definido pelo servidor.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch(':id/start')
  @HttpCode(204)
  start(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.driverTrips.start(user.id, id);
  }

  @ApiEndpoint('Registrar início real do retorno', {
    access: 'MOTORISTA',
    status: 204,
    description:
      'Somente IN_PROGRESS, uma vez; instante definido pelo servidor.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch(':id/start-return')
  @HttpCode(204)
  startReturn(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.driverTrips.startReturn(user.id, id);
  }

  @ApiEndpoint('Concluir viagem atribuída', {
    access: 'MOTORISTA',
    status: 204,
    description:
      'Somente IN_PROGRESS após início do retorno; instante definido pelo servidor.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch(':id/complete')
  @HttpCode(204)
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.driverTrips.complete(user.id, id);
  }

  @ApiEndpoint('Registrar embarque ou ausência na ida', {
    access: 'MOTORISTA',
    status: 204,
    description:
      'Somente IN_PROGRESS antes do início do retorno. Aceita BOARDED ou NO_SHOW; PLANNED é recusado.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @ApiParam({
    name: 'participationId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
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

  @ApiEndpoint('Registrar situação do retorno', {
    access: 'MOTORISTA',
    status: 204,
    description:
      'NOT_RETURNING é aviso prévio durante a viagem, com reason. RETURNED e NO_SHOW exigem retorno iniciado. RETURNED exige ida BOARDED. NO_SHOW exige reason e contactAttempt; gera ocorrência e tentativa de contato. EXPECTED é recusado. Não há timeout automático.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @ApiParam({
    name: 'participationId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
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

  @ApiEndpoint('Registrar ocorrência ou tentativa de contato', {
    access: 'MOTORISTA',
    status: 204,
    description:
      'Somente IN_PROGRESS. CONTACT_ATTEMPT exige patientTripId ativo da mesma viagem. Dados de transporte, sem informação clínica.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
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
