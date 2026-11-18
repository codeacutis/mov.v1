import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuthUser } from './auth.types';
import { AuthService } from './auth.service';
import { CurrentUser, Public } from './decorators';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { PasswordResetService } from './password-reset.service';
import { BootstrapAdminDto } from '../users/dto/user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  /** Cria o primeiro ADMIN. Só funciona enquanto não existir nenhum usuário. */
  @Public()
  @Post('bootstrap')
  bootstrap(@Body() dto: BootstrapAdminDto) {
    return this.users.createFirstAdmin(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /** Resposta idêntica exista ou não a conta (sem enumeração de e-mails). */
  @Public()
  @Post('forgot-password')
  @HttpCode(202)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.passwordReset.request(dto.email);
    return {
      message:
        'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(204)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.passwordReset.reset(dto.token, dto.password);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthUser): Promise<void> {
    await this.auth.logout(user.sessionId);
  }

  /** Rota protegida mínima: devolve a identidade da sessão atual. */
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { id: user.id, name: user.name, role: user.role };
  }
}
