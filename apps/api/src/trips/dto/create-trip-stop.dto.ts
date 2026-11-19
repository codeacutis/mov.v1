import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { StopDirection, StopType } from '../../generated/prisma/client';

export class StopPatientDto {
  @IsUUID()
  patientId!: string;
}

export class CreateTripStopDto {
  @IsEnum(StopDirection)
  direction!: StopDirection;

  @IsInt()
  @Min(1)
  sequence!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  municipality!: string;

  @IsEnum(StopType)
  stopType!: StopType;

  @IsOptional()
  @IsISO8601()
  plannedArrivalAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => StopPatientDto)
  patients?: StopPatientDto[];
}
