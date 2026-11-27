import { ApiEndpoint } from '../documentation/api-endpoint';
import { page } from '../documentation/response-schemas';
import { ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Roles } from '../auth/decorators';
import { PageQueryDto } from '../common/page-query.dto';
import { Prisma, Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

class AuditQuery extends PageQueryDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 100,
    description:
      'Busca textual sem distinção de maiúsculas; campos pesquisados descritos na operação.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare q?: string;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  actorUserId?: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    format: 'date-time',
    description: 'Início inclusivo do período, em ISO 8601 com fuso horário.',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  start?: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    format: 'date-time',
    description: 'Fim exclusivo do período, posterior a start.',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  end?: string;
}

@ApiTags('Auditoria')
@Controller('audit')
@Roles(Role.ADMIN)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}
  @ApiEndpoint('Consultar trilha de auditoria', {
    access: 'ADMIN',
    schema: page('AuditEntry'),
    description:
      'Filtros combinados; busca q em ação, entidade ou nome do ator. start inclusivo/end exclusivo, start < end. Ordenação occurredAt/id decrescente.',
  })
  @Get()
  async list(@Query() query: AuditQuery) {
    const {
      page = 1,
      limit = 20,
      q,
      action,
      entityType,
      actorUserId,
      start,
      end,
    } = query;
    if (start && end && new Date(start) >= new Date(end))
      throw new BadRequestException('Período inválido.');
    const where: Prisma.AuditLogWhereInput = {
      ...(q?.trim() && {
        OR: [
          { action: { contains: q.trim(), mode: 'insensitive' } },
          { entityType: { contains: q.trim(), mode: 'insensitive' } },
          { actor: { name: { contains: q.trim(), mode: 'insensitive' } } },
        ],
      }),
      ...(action?.trim() && {
        action: { contains: action.trim(), mode: 'insensitive' },
      }),
      ...(entityType?.trim() && {
        entityType: { contains: entityType.trim(), mode: 'insensitive' },
      }),
      ...(actorUserId && { actorUserId }),
      ...((start || end) && {
        occurredAt: {
          ...(start && { gte: new Date(start) }),
          ...(end && { lt: new Date(end) }),
        },
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          actorUserId: true,
          actor: { select: { name: true } },
          action: true,
          entityType: true,
          entityId: true,
          occurredAt: true,
          reason: true,
          changes: true,
        },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total, page, limit };
  }
}
