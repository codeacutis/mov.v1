import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { VehicleStatus } from '../../generated/prisma/client';

const normalizePlate = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const trimDescription = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateVehicleDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    pattern: '^[A-Z0-9]{7}$',
  })
  @IsOptional()
  @Transform(normalizePlate)
  @IsString()
  @Matches(/^[A-Z0-9]{7}$/, {
    message: 'A placa deve conter 7 letras ou números',
  })
  plate?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 160 })
  @IsOptional()
  @Transform(trimDescription)
  @IsString()
  @MaxLength(160)
  description?: string | null;

  @ApiPropertyOptional({ type: 'integer', nullable: true, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ enum: VehicleStatus, nullable: true })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;
}
