import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePatientDto {
  @ApiProperty({ type: String, maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  birthDate!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 20 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 15 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(15)
  susCardNumber?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 300 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  usesWheelchair?: boolean;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasReducedMobility?: boolean;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  needsBoardingAssistance?: boolean;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 500,
    description:
      'Somente observações operacionais necessárias ao transporte; não incluir diagnósticos.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  operationalNotes?: string;
}

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}
