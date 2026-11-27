import { ApiEndpoint } from '../documentation/api-endpoint';
import { ref } from '../documentation/response-schemas';
import { ApiTags, ApiHeader } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { BootstrapGuard } from './bootstrap.guard';
import { AuthUser } from './auth.types';
import { AuthService } from './auth.service';
import { Authenticated, CurrentUser, Public } from './decorators';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { PasswordResetService } from './password-reset.service';
import { BootstrapAdminDto } from '../users/dto/user.dto';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  /** Cria o primeiro ADMIN. Só funciona enquanto não existir nenhum usuário. */
  @ApiHeader({
    name: 'x-bootstrap-secret',
    required: false,
    description:
      'Exigido em produção para a inicialização autorizada. Obtenha pelo canal seguro de implantação; não salvar no Swagger.',
  })
  @ApiEndpoint('Criar o primeiro ADMIN', {
    access: 'PUBLIC',
    schema: ref('User'),
    status: 201,
    description:
      'Disponível somente enquanto não houver usuários. Não é autocadastro público.',
    errors: [403, 409],
  })
  @Public()
  @Post('bootstrap')
  @UseGuards(BootstrapGuard)
  bootstrap(@Body() dto: BootstrapAdminDto) {
    return this.users.createFirstAdmin(dto);
  }

  @ApiEndpoint('Autenticar e criar sessão', {
    access: 'PUBLIC',
    schema: ref('LoginResponse'),
    errors: [401],
  })
  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /** Resposta idêntica exista ou não a conta (sem enumeração de e-mails). */
  @ApiEndpoint('Solicitar recuperação de senha', {
    access: 'PUBLIC',
    schema: ref('RecoveryResponse'),
    status: 202,
    description:
      'Resposta idêntica para contas existentes e inexistentes; não devolve token de recuperação.',
  })
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

  @ApiEndpoint('Redefinir senha e revogar sessões', {
    access: 'PUBLIC',
    status: 204,
  })
  @Public()
  @Post('reset-password')
  @HttpCode(204)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.passwordReset.reset(dto.token, dto.password);
  }

  @ApiEndpoint('Revogar a sessão atual', {
    access: 'AUTHENTICATED',
    status: 204,
  })
  @Authenticated()
  @Post('logout')
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthUser): Promise<void> {
    await this.auth.logout(user.sessionId);
  }

  /** Rota protegida mínima: devolve a identidade da sessão atual. */
  @ApiEndpoint('Consultar identidade da sessão', {
    access: 'AUTHENTICATED',
    schema: ref('SessionIdentity'),
  })
  @Authenticated()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { id: user.id, name: user.name, role: user.role };
  }
}
