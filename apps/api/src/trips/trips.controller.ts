import { ApiEndpoint } from '../documentation/api-endpoint';
import { ref, array, page } from '../documentation/response-schemas';
import { ApiProperty, ApiTags, ApiParam } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { PageQueryDto } from '../common/page-query.dto';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import { CreateTripDto } from './dto/create-trip.dto';
import { InterruptTripDto, UpdateTripDto } from './dto/update-trip.dto';
import { CorrectActualTimesDto } from './dto/correct-actual-times.dto';
import { TripsService } from './trips.service';

class CancelTripDto {
  @ApiProperty({
    type: String,
    minLength: 1,
    maxLength: 500,
    description:
      'Justificativa operacional obrigatória nos casos descritos na operação.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
class TripObservationDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 1000 })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  description!: string;
}

@ApiTags('Viagens')
@Controller('trips')
@Roles(Role.ADMIN)
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @ApiEndpoint('Listar viagems', {
    access: 'ADMIN',
    schema: page('Trip'),
    description:
      'Ordenação saída decrescente; q busca ponto municipal, placa ou motorista. Inclui registros históricos/inativos. Paginação com page/limit. Não há parâmetro de ordenação.',
  })
  @Get()
  list(@Query() query: PageQueryDto) {
    return this.trips.list(query.q, query.page, query.limit);
  }

  @ApiEndpoint('Consultar viagem', {
    access: 'ADMIN',
    schema: ref('Trip'),
    errors: [404],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.trips.get(id);
  }

  @ApiEndpoint('Cadastrar viagem', {
    access: 'ADMIN',
    schema: ref('Trip'),
    status: 201,
    description:
      'Retorno planejado posterior à saída; verifica disponibilidade e conflitos de agenda.',
    errors: [404, 409],
  })
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateTripDto) {
    return this.trips.create(actor.id, dto);
  }

  @ApiEndpoint('Editar viagem', {
    access: 'ADMIN',
    schema: ref('Trip'),
    description:
      'Somente antes do início. Valida agenda/capacidade e invalida aprovação da rota.',
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
    @Body() dto: UpdateTripDto,
  ) {
    return this.trips.update(actor.id, id, dto);
  }

  @ApiEndpoint('Iniciar viagem', {
    access: 'ADMIN',
    schema: ref('Trip'),
    description: 'Somente SCHEDULED; horário real registrado pelo servidor.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch(':id/start')
  @HttpCode(200)
  start(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.trips.start(actor.id, id);
  }

  @ApiEndpoint('Concluir viagem', {
    access: 'ADMIN',
    schema: ref('Trip'),
    description: 'Somente IN_PROGRESS; chegada real registrada pelo servidor.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch(':id/complete')
  @HttpCode(200)
  complete(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.trips.complete(actor.id, id);
  }

  @ApiEndpoint('Cancelar viagem antes do início', {
    access: 'ADMIN',
    schema: ref('Trip'),
    description: 'Somente SCHEDULED; motivo obrigatório.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch(':id/cancel')
  cancel(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CancelTripDto,
  ) {
    return this.trips.cancel(actor.id, id, dto.reason);
  }

  @ApiEndpoint('Interromper viagem em andamento', {
    access: 'ADMIN',
    schema: ref('Trip'),
    description: 'Motivo e providências obrigatórios.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch(':id/interrupt')
  interrupt(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: InterruptTripDto,
  ) {
    return this.trips.interrupt(actor.id, id, dto);
  }

  @ApiEndpoint('Aprovar a rota completa', {
    access: 'ADMIN',
    schema: ref('Trip'),
    description:
      'Somente SCHEDULED; exige ida/retorno correspondentes e vínculos completos. Mudanças relevantes invalidam a aprovação.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch(':id/approve-route')
  @HttpCode(200)
  approveRoute(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.trips.approveRoute(actor.id, id);
  }

  @ApiEndpoint('Listar ocorrências da viagem', {
    access: 'ADMIN',
    schema: array(ref('ObservationWithAuthor')),
    errors: [404],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Get(':id/observations')
  observations(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.trips.listObservations(id);
  }

  @ApiEndpoint('Corrigir horários reais com justificativa', {
    access: 'ADMIN',
    schema: ref('Trip'),
    description:
      'Somente horários já registrados, não futuros e em ordem cronológica. Auditoria obrigatória.',
    errors: [404, 409],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Patch(':id/actual-times')
  correctActualTimes(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CorrectActualTimesDto,
  ) {
    return this.trips.correctActualTimes(actor.id, id, dto);
  }

  @ApiEndpoint('Registrar ocorrência operacional', {
    access: 'ADMIN',
    schema: ref('Observation'),
    status: 201,
    description: 'Não incluir informações clínicas.',
    errors: [404],
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador UUID do recurso.',
  })
  @Post(':id/observations')
  addObservation(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: TripObservationDto,
  ) {
    return this.trips.addObservation(actor.id, id, dto.description);
  }
}
