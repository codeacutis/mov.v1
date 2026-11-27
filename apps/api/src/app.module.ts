import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateWebOrigin } from './common/web-origin';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { DriversModule } from './drivers/drivers.module';
import { PatientsModule } from './patients/patients.module';
import { DriverTripsModule } from './driver-trips/driver-trips.module';
import { TripsModule } from './trips/trips.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env: Record<string, unknown>) => {
        validateWebOrigin(env);
        const secret = env.JWT_SECRET;
        if (typeof secret !== 'string' || secret.length < 32) {
          throw new Error(
            'JWT_SECRET ausente ou curto demais (mínimo 32 caracteres)',
          );
        }
        if (!env.DATABASE_URL) throw new Error('DATABASE_URL ausente');
        const ttl = Number(env.SESSION_TTL_SECONDS ?? 3600);
        if (!Number.isInteger(ttl) || ttl <= 0) {
          throw new Error('SESSION_TTL_SECONDS inválido');
        }
        return env;
      },
    }),
    PrismaModule,
    AuditModule,
    UsersModule,
    VehiclesModule,
    DriversModule,
    PatientsModule,
    TripsModule,
    DriverTripsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
