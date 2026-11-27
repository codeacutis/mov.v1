import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  patientId!: string;
}

export class CreateTripStopDto {
  @ApiProperty({ enum: StopDirection })
  @IsEnum(StopDirection)
  direction!: StopDirection;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 2147483647 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  sequence!: number;

  @ApiProperty({ type: String, maxLength: 200 })
  @IsString()
  @Matches(/\S/)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ type: String, maxLength: 300 })
  @IsString()
  @Matches(/\S/)
  @MaxLength(300)
  address!: string;

  @ApiProperty({ type: String, maxLength: 100 })
  @IsString()
  @Matches(/\S/)
  @MaxLength(100)
  municipality!: string;

  @ApiProperty({ enum: StopType })
  @IsEnum(StopType)
  stopType!: StopType;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  plannedArrivalAt?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    type: StopPatientDto,
    isArray: true,
    description:
      'Pacientes já associados à viagem. Use patientId. Em edição, [] remove vínculos; omitir preserva vínculos.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayUnique((p: StopPatientDto | null) => p?.patientId)
  @ValidateNested({ each: true })
  @Type(() => StopPatientDto)
  patients?: StopPatientDto[];
}

export class ReorderTripStopsDto {
  @ApiProperty({ enum: StopDirection })
  @IsEnum(StopDirection)
  direction!: StopDirection;

  @ApiProperty({
    type: String,
    isArray: true,
    description:
      'Todos os IDs das paradas da ida, sem duplicidade, na ordem desejada.',
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  stopIds!: string[];
}
