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
  Post,
  Patch,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import {
  CreateTripStopDto,
  ReorderTripStopsDto,
} from './dto/create-trip-stop.dto';
import { TripStopsService } from './trip-stops.service';

@ApiTags('Paradas')
@Controller('trips/:tripId/stops')
@Roles(Role.ADMIN)
export class TripStopsController {
  constructor(private readonly stops: TripStopsService) {}

  @ApiEndpoint('Listar paradas e pacientes vinculados', {
    access: 'ADMIN',
    schema: array(ref('Stop')),
    description:
      'Ordenação direction/sequence crescente. Na operação, o retorno é percorrido na ordem inversa.',
    errors: [404],
  })
  @ApiParam({
    name: 'tripId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Get()
  list(@Param('tripId', new ParseUUIDPipe()) tripId: string) {
    return this.stops.listByTrip(tripId);
  }

  @ApiEndpoint('Cadastrar parada', {
    access: 'ADMIN',
    schema: ref('Stop'),
    status: 201,
    description:
      'Somente SCHEDULED. Alteração invalida aprovação atomicamente. A ida sincroniza o retorno.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'tripId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Post()
  create(
    @CurrentUser() actor: AuthUser,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: CreateTripStopDto,
  ) {
    return this.stops.create(actor.id, tripId, dto);
  }

  @ApiEndpoint('Reorganizar manualmente a ida', {
    access: 'ADMIN',
    description:
      'Sem corpo de resposta. Envie todos os IDs da ida na ordem desejada, direction OUTBOUND. Retorno em ordem inversa. Somente SCHEDULED; invalida aprovação.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'tripId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch('reorder')
  reorder(
    @CurrentUser() actor: AuthUser,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: ReorderTripStopsDto,
  ) {
    return this.stops.reorder(actor.id, tripId, dto.direction, dto.stopIds);
  }

  @ApiEndpoint('Reconstruir retorno a partir da ida', {
    access: 'ADMIN',
    status: 201,
    description:
      'Sem corpo de resposta. Somente SCHEDULED; invalida aprovação.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'tripId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Post('rebuild-return')
  rebuildReturn(
    @CurrentUser() actor: AuthUser,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
  ) {
    return this.stops.rebuildReturn(actor.id, tripId);
  }

  @ApiEndpoint('Editar parada e vínculos de pacientes', {
    access: 'ADMIN',
    schema: ref('Stop'),
    description:
      'Corpo completo. Somente SCHEDULED. Não altera direção. patients usa patientId, não o id da participação. Lista vazia remove vínculos. Invalida aprovação.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'tripId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @ApiParam({
    name: 'stopId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch(':stopId')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Param('stopId', new ParseUUIDPipe()) stopId: string,
    @Body() dto: CreateTripStopDto,
  ) {
    return this.stops.update(actor.id, tripId, stopId, dto);
  }

  @ApiEndpoint('Remover parada', {
    access: 'ADMIN',
    status: 204,
    description: 'Somente SCHEDULED; invalida aprovação e sincroniza retorno.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'tripId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @ApiParam({
    name: 'stopId',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Delete(':stopId')
  @HttpCode(204)
  remove(
    @CurrentUser() actor: AuthUser,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Param('stopId', new ParseUUIDPipe()) stopId: string,
  ) {
    return this.stops.remove(actor.id, tripId, stopId);
  }
}
