import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ type: String, format: 'email', maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    type: String,
    minLength: 1,
    maxLength: 200,
    writeOnly: true,
    description: 'Senha de entrada; nunca retornada pela API.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;
}
