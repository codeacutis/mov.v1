import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { TripsModule } from './trips/trips.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env: Record<string, unknown>) => {
        const secret = env.JWT_SECRET;
        if (typeof secret !== 'string' || secret.length < 32) {
          throw new Error(
            'JWT_SECRET ausente ou curto demais (mínimo 32 caracteres)',
          );
        }
        if (!env.DATABASE_URL) throw new Error('DATABASE_URL ausente');
        return env;
      },
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    TripsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
