import { ApiEndpoint } from '../documentation/api-endpoint';
import { ref } from '../documentation/response-schemas';
import { ApiTags } from '@nestjs/swagger';
import { Body, Controller, Post } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from '../generated/prisma/client';
import { CreateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('Usuários')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @ApiEndpoint('Criar conta administrativa', {
    access: 'ADMIN',
    schema: ref('User'),
    status: 201,
    description:
      'role MOTORISTA é recusado. Use POST /drivers para criar conta e vínculo 1:1.',
    errors: [409],
  })
  @Post()
  @Roles(Role.ADMIN)
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(actor.id, dto);
  }
}
