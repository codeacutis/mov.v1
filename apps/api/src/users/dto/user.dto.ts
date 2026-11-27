import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ type: String, maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ type: String, format: 'email', maxLength: 254 })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    type: String,
    minLength: 10,
    maxLength: 72,
    writeOnly: true,
    description: 'Senha de entrada; nunca retornada pela API.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(72)
  password!: string;
}

export class CreateUserDto extends BootstrapAdminDto {
  @ApiProperty({
    enum: Role,
    description:
      'POST /users aceita apenas ADMIN na regra de negócio; para MOTORISTA use POST /drivers.',
  })
  @IsEnum(Role)
  role!: Role;
}
