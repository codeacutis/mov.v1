import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { Prisma, Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BootstrapAdminDto, CreateUserDto } from './dto/user.dto';

const BCRYPT_COST = 12;
// Chave do advisory lock que serializa a criação do primeiro ADMIN.
const BOOTSTRAP_LOCK_KEY = 827361;

// Nunca devolver passwordHash.
const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Cadastro de usuário (ADMIN). A autorização é feita pelo RolesGuard no
   * controller; aqui só aplicamos regras de dados.
   */
  async create(actorUserId: string, dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    return this.prisma.$transaction(async (tx) => {
      const user = await this.insert(tx, { ...dto, passwordHash });
      await this.audit.record(tx, {
        actorUserId,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        // Sem e-mail, nome ou senha: apenas o papel.
        changes: { role: dto.role },
      });
      return user;
    });
  }

  /**
   * Cria o primeiro ADMIN. O lock transacional garante que duas chamadas
   * simultâneas não criem dois administradores de bootstrap.
   */
  async createFirstAdmin(dto: BootstrapAdminDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOTSTRAP_LOCK_KEY})`;
      if ((await tx.user.count()) > 0) {
        throw new ForbiddenException('O sistema já foi inicializado');
      }
      const user = await this.insert(tx, {
        ...dto,
        role: Role.ADMIN,
        passwordHash,
      });
      await this.audit.record(tx, {
        actorUserId: user.id,
        action: 'ADMIN_BOOTSTRAPPED',
        entityType: 'User',
        entityId: user.id,
      });
      return user;
    });
  }

  private async insert(
    tx: Prisma.TransactionClient,
    data: { name: string; email: string; role: Role; passwordHash: string },
  ) {
    try {
      return await tx.user.create({
        data: {
          name: data.name.trim(),
          email: data.email,
          role: data.role,
          passwordHash: data.passwordHash,
        },
        select: publicUserSelect,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('E-mail já cadastrado');
      }
      throw err;
    }
  }
}
