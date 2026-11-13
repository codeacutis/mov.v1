import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import { CreateTripDto } from './dto/create-trip.dto';
import { TripsService } from './trips.service';

class CancelTripDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

@Controller('trips')
@Roles(Role.ADMIN)
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  list() {
    return this.trips.list();
  }

  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateTripDto) {
    return this.trips.create(actor.id, dto);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CancelTripDto,
  ) {
    return this.trips.cancel(actor.id, id, dto.reason);
  }
}
