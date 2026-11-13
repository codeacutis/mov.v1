import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
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

  list() {
    return this.prisma.driver.findMany({
      select: driverSelect,
      orderBy: { user: { name: 'asc' } },
    });
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
    });
  }

  async inactivate(actorUserId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findUnique({
        where: { id },
        select: { id: true, userId: true, isActive: true },
      });
      if (!driver) throw new NotFoundException('Motorista não encontrado');
      if (!driver.isActive) return driver;

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
