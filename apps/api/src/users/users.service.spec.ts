import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role } from '../generated/prisma/client';

describe('UsersService driver invariant', () => {
  it('rejects a MOTORISTA before creating any account', async () => {
    const transaction = jest.fn();
    const service = new UsersService({ $transaction: transaction } as unknown as PrismaService, {} as AuditService);
    await expect(service.create('actor', { name: 'Motorista fict?cio', email: 'driver@example.invalid', password: 'fictional-password', role: Role.MOTORISTA })).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
