import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
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

export class CreateVehicleDto {
  @Transform(normalizePlate)
  @IsString()
  @Matches(/^[A-Z0-9]{7}$/, { message: 'A placa deve conter 7 letras ou números' })
  plate!: string;

  @IsOptional()
  @Transform(trimDescription)
  @IsString()
  @MaxLength(160)
  description?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity!: number;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;
}