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

@Controller('drivers')
@Roles(Role.ADMIN)
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get()
  list(@Query() query: PageQueryDto) {
    return this.drivers.list(query.q, query.page, query.limit);
  }

  @Get('inconsistencies')
  inconsistencies() { return this.drivers.inconsistencies(); }

  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateDriverDto) {
    return this.drivers.create(actor.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.drivers.update(actor.id, id, dto);
  }

  @Patch(':id/inactivate')
  inactivate(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.drivers.inactivate(actor.id, id);
  }
}
