import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ type: String, format: 'email', maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto {
  /** Token opaco em base64url (32 bytes aleatórios => 43 caracteres). */
  @ApiProperty({
    type: String,
    writeOnly: true,
    pattern: '^[A-Za-z0-9_-]{20,128}$',
    description:
      'Token de recuperação recebido pelo canal configurado; nunca use token real em exemplos.',
  })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{20,128}$/, { message: 'token inválido' })
  token!: string;

  /** Mesma política de senha do cadastro: 10 a 72 caracteres (limite do bcrypt). */
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
