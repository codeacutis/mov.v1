import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ForgotPasswordDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto {
  /** Token opaco em base64url (32 bytes aleatórios => 43 caracteres). */
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{20,128}$/, { message: 'token inválido' })
  token!: string;

  /** Mesma política de senha do cadastro: 10 a 72 caracteres (limite do bcrypt). */
  @IsString()
  @MinLength(10)
  @MaxLength(72)
  password!: string;
}
