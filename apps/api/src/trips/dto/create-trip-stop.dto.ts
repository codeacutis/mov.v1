import { Type } from 'class-transformer';
import {
  IsEnum,
  IsArray,
  ArrayUnique,
  Matches,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Max,
  ValidateIf,
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
  @Max(2147483647)
  sequence!: number;

  @IsString()
  @Matches(/\S/)
  @MaxLength(200)
  name!: string;

  @IsString()
  @Matches(/\S/)
  @MaxLength(300)
  address!: string;

  @IsString()
  @Matches(/\S/)
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

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayUnique((p: StopPatientDto | null) => p?.patientId)
  @ValidateNested({ each: true })
  @Type(() => StopPatientDto)
  patients?: StopPatientDto[];
}

export class ReorderTripStopsDto {
  @IsEnum(StopDirection)
  direction!: StopDirection;

  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  stopIds!: string[];
}
