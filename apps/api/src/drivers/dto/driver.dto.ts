import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  ValidateIf,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateDriverDto {
  @ApiProperty({ type: String, maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ type: String, format: 'email', maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
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

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 11 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(11)
  licenseNumber?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2)
  licenseCategory?: string;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  @IsOptional()
  @ValidateIf((_object, value) => value !== '')
  @IsDateString()
  licenseExpiresAt?: string;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  @IsOptional()
  @IsBoolean()
  hasPassengerTransportCourse?: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateDriverDto extends PartialType(CreateDriverDto) {}
