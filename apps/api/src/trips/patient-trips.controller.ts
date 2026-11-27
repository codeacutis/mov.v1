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

@ApiTags('Participações')
@Controller()
@Roles(Role.ADMIN)
export class PatientTripsController {
  constructor(private readonly patientTrips: PatientTripsService) {}

  @ApiEndpoint('Listar participações da viagem, incluindo canceladas', {
    access: 'ADMIN',
    schema: array(ref('Participation')),
    errors: [404],
  })
  @ApiParam({
    name: 'tripId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Get('trips/:tripId/patient-trips')
  list(@Param('tripId', new ParseUUIDPipe()) tripId: string) {
    return this.patientTrips.list(tripId);
  }

  @ApiEndpoint('Adicionar paciente à viagem', {
    access: 'ADMIN',
    schema: ref('Participation'),
    status: 201,
    description:
      'Somente SCHEDULED. Impede duplicidade e excesso de capacidade. Consulta e prioridade com justificativa obrigatórias.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'tripId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Post('trips/:tripId/patient-trips')
  create(
    @CurrentUser() actor: AuthUser,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: CreatePatientTripDto,
  ) {
    return this.patientTrips.create(actor.id, tripId, dto);
  }

  @ApiEndpoint('Cancelar logicamente a participação', {
    access: 'ADMIN',
    schema: ref('Participation'),
    description:
      'Somente antes do início, com motivo. Preserva histórico e libera vagas; não permite reincluir o mesmo paciente.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch('patient-trips/:id/cancel')
  cancel(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CancelPatientTripDto,
  ) {
    return this.patientTrips.cancel(actor.id, id, dto.reason);
  }

  @ApiEndpoint('Alterar consulta, prioridade ou confirmação', {
    access: 'ADMIN',
    schema: ref('Participation'),
    description:
      'Planejamento antes do início. Alterar prioridade exige justificativa; responsável e instante são registrados pelo servidor.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch('patient-trips/:id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePatientTripDto,
  ) {
    return this.patientTrips.update(actor.id, id, dto);
  }

  @ApiEndpoint('Alterar estado da ida', {
    access: 'ADMIN',
    schema: ref('Participation'),
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch('patient-trips/:id/outbound-status')
  updateOutbound(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOutboundStatusDto,
  ) {
    return this.patientTrips.updateOutboundStatus(actor.id, id, dto.status);
  }

  @ApiEndpoint('Alterar estado independente do retorno', {
    access: 'ADMIN',
    schema: ref('Participation'),
    description:
      'NOT_RETURNING e NO_SHOW exigem motivo. RETURNED exige ida BOARDED.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch('patient-trips/:id/return-status')
  updateReturn(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReturnStatusDto,
  ) {
    return this.patientTrips.updateReturnStatus(actor.id, id, dto);
  }
}
