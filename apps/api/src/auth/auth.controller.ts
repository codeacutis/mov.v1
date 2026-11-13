import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuthUser } from './auth.types';
import { AuthService } from './auth.service';
import { CurrentUser, Public } from './decorators';
import { LoginDto } from './dto/login.dto';
import { BootstrapAdminDto } from '../users/dto/user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
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
