import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { VehicleStatus } from '../../generated/prisma/client';

const normalizePlate = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const trimDescription = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateVehicleDto {
  @ApiProperty({
    type: String,
    pattern: '^[A-Z0-9]{7}$',
    description: 'Placa normalizada em maiúsculas, com 7 letras ou números.',
  })
  @Transform(normalizePlate)
  @IsString()
  @Matches(/^[A-Z0-9]{7}$/, {
    message: 'A placa deve conter 7 letras ou números',
  })
  plate!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 160 })
  @IsOptional()
  @Transform(trimDescription)
  @IsString()
  @MaxLength(160)
  description?: string | null;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60, { message: 'A capacidade deve ser de no máximo 60 passageiros' })
  capacity!: number;

  @ApiPropertyOptional({ enum: VehicleStatus, nullable: true })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;
}
