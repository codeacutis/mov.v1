import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { BrevoPasswordResetNotifier } from './brevo-password-reset.notifier';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  DevPasswordResetNotifier,
  PasswordResetNotifier,
} from './password-reset.notifier';
import { PasswordResetService } from './password-reset.service';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordResetService,
    // Com BREVO_API_KEY e MAIL_FROM_EMAIL entrega por e-mail; senão, fallback de dev.
    {
      provide: PasswordResetNotifier,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PasswordResetNotifier =>
        config.get<string>('BREVO_API_KEY') &&
        config.get<string>('MAIL_FROM_EMAIL')
          ? new BrevoPasswordResetNotifier(config)
          : new DevPasswordResetNotifier(config),
    },
    // Ordem importa: autentica primeiro, depois autoriza por papel.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
