import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../generated/prisma/client';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/**
 * Política de senha provisória: mínimo 10 caracteres. O máximo de 72 existe
 * porque o bcrypt só considera os primeiros 72 bytes.
 */
export class BootstrapAdminDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(72)
  password!: string;
}

export class CreateUserDto extends BootstrapAdminDto {
  @IsEnum(Role)
  role!: Role;
}
