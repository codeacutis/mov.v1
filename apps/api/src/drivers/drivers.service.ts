import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { lockOperationalIntegrity } from '../common/operational-integrity';
import { AuditService } from '../audit/audit.service';
import { Prisma, Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';

const BCRYPT_COST = 12;

const driverSelect = {
  id: true,
  isActive: true,
  licenseNumber: true,
  licenseCategory: true,
  licenseExpiresAt: true,
  hasPassengerTransportCourse: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  },
} satisfies Prisma.DriverSelect;

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async inconsistencies() {
    const users = await this.prisma.user.findMany({
      where: { role: Role.MOTORISTA, driver: { is: null } },
      select: { id: true, isActive: true },
    });
    const drivers = await this.prisma.driver.findMany({
      where: { OR: [ { user: { role: { not: Role.MOTORISTA } } }, { isActive: true, user: { isActive: false } }, { isActive: false, user: { isActive: true } } ] },
      select: { id: true, userId: true },
    });
    return { usersWithoutDriver: users, inconsistentDrivers: drivers };
  }

  async list(q?: string, page = 1, limit = 20) {
    const where: Prisma.DriverWhereInput = q
      ? {
          OR: [
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
            { licenseNumber: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        select: driverSelect,
        orderBy: { user: { name: 'asc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.driver.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async create(actorUserId: string, dto: CreateDriverDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: dto.name.trim(),
            email: dto.email,
            role: Role.MOTORISTA,
            passwordHash,
          },
          select: { id: true },
        });
        const driver = await tx.driver.create({
          data: {
            userId: user.id,
            licenseNumber: dto.licenseNumber?.trim() || null,
            licenseCategory: dto.licenseCategory?.trim() || null,
            licenseExpiresAt: dto.licenseExpiresAt ? new Date(dto.licenseExpiresAt) : null,
            hasPassengerTransportCourse: dto.hasPassengerTransportCourse ?? false,
            notes: dto.notes?.trim() || null,
          },
          select: driverSelect,
        });
        await this.audit.record(tx, {
          actorUserId,
          action: 'DRIVER_CREATED',
          entityType: 'Driver',
          entityId: driver.id,
          changes: { fields: ['name', 'email', 'licenseCategory'] },
        });
        return driver;
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

  async update(actorUserId: string, id: string, dto: UpdateDriverDto) {
    return this.prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });
      if (!driver) throw new NotFoundException('Motorista não encontrado');

      const userData: Prisma.UserUpdateInput = {};
      if (dto.name !== undefined) userData.name = dto.name.trim();
      if (dto.email !== undefined) userData.email = dto.email;
      if (dto.password !== undefined)
        userData.passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: driver.userId }, data: userData });
      }

      await tx.driver.update({ where: { id }, data: {
        ...(dto.licenseNumber !== undefined && { licenseNumber: dto.licenseNumber.trim() || null }),
        ...(dto.licenseCategory !== undefined && { licenseCategory: dto.licenseCategory.trim() || null }),
        ...(dto.licenseExpiresAt !== undefined && { licenseExpiresAt: dto.licenseExpiresAt ? new Date(dto.licenseExpiresAt) : null }),
        ...(dto.hasPassengerTransportCourse !== undefined && { hasPassengerTransportCourse: dto.hasPassengerTransportCourse }),
        ...(dto.notes !== undefined && { notes: dto.notes.trim() || null }),
      } });
      const updated = await tx.driver.findUnique({
        where: { id },
        select: driverSelect,
      });
      await this.audit.record(tx, {
        actorUserId,
        action: 'DRIVER_UPDATED',
        entityType: 'Driver',
        entityId: id,
        changes: { fields: Object.keys(dto) },
      });
      return updated;
    }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('E-mail j? cadastrado');
      }
      throw error;
    });
  }

  async inactivate(actorUserId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockOperationalIntegrity(tx);
      const driver = await tx.driver.findUnique({
        where: { id },
        select: { id: true, userId: true, isActive: true },
      });
      if (!driver) throw new NotFoundException('Motorista não encontrado');


      await tx.driver.update({ where: { id }, data: { isActive: false } });
      await tx.user.update({
        where: { id: driver.userId },
        data: { isActive: false },
      });
      await this.audit.record(tx, {
        actorUserId,
        action: 'DRIVER_INACTIVATED',
        entityType: 'Driver',
        entityId: id,
        changes: { isActive: { from: true, to: false } },
      });
      return tx.driver.findUnique({ where: { id }, select: driverSelect });
    });
  }
}
