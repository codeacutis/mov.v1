import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import { DriverTripsService } from './driver-trips.service';

/** Rotas exclusivas do MOTORISTA. O ADMIN usa /trips. */
@Controller('driver/trips')
@Roles(Role.MOTORISTA)
export class DriverTripsController {
  constructor(private readonly driverTrips: DriverTripsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.driverTrips.list(user.id);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.driverTrips.get(user.id, id);
  }
}
