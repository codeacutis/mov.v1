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
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import { DriversService } from './drivers.service';

@ApiTags('Motoristas')
@Controller('drivers')
@Roles(Role.ADMIN)
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @ApiEndpoint('Listar motoristas', {
    access: 'ADMIN',
    schema: page('Driver'),
    description:
      'Ordenação nome do usuário crescente; q busca nome, e-mail ou CNH. Inclui registros históricos/inativos. Paginação com page/limit. Não há parâmetro de ordenação.',
  })
  @Get()
  list(@Query() query: PageQueryDto) {
    return this.drivers.list(query.q, query.page, query.limit);
  }

  @ApiEndpoint('Identificar vínculos inconsistentes sem remover registros', {
    access: 'ADMIN',
    schema: ref('DriverInconsistencies'),
  })
  @Get('inconsistencies')
  inconsistencies() {
    return this.drivers.inconsistencies();
  }

  @ApiEndpoint('Cadastrar motorista', {
    access: 'ADMIN',
    schema: ref('Driver'),
    status: 201,
    description: 'Cria conta MOTORISTA e Driver 1:1 na mesma transação.',
    errors: [404, 409],
  })
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateDriverDto) {
    return this.drivers.create(actor.id, dto);
  }

  @ApiEndpoint('Editar motorista', {
    access: 'ADMIN',
    schema: ref('Driver'),
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
    @Body() dto: UpdateDriverDto,
  ) {
    return this.drivers.update(actor.id, id, dto);
  }

  @ApiEndpoint('Inativar motorista preservando histórico', {
    access: 'ADMIN',
    schema: ref('Driver'),
    description: 'Inativa motorista e conta na mesma transação.',
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
    return this.drivers.inactivate(actor.id, id);
  }
}
