import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Priority, TripStatus } from '../../generated/prisma/client';

/** ISO-8601 com fuso explícito (Z ou ±hh:mm), para não haver ambiguidade. */
const ISO_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const ISO_MESSAGE =
  '$property deve ser data ISO-8601 com fuso (ex.: 2026-12-01T06:00:00-03:00)';

export class CreateTripDto {
  @IsUUID()
  driverId!: string;

  @IsUUID()
  vehicleId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  municipalPickupPoint!: string;

  @Matches(ISO_WITH_OFFSET, { message: ISO_MESSAGE })
  plannedDepartureAt!: string;

  @Matches(ISO_WITH_OFFSET, { message: ISO_MESSAGE })
  plannedReturnStartAt!: string;

  @Matches(ISO_WITH_OFFSET, { message: ISO_MESSAGE })
  plannedReturnEndAt!: string;
}

export class UpdateTripDto {
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  municipalPickupPoint?: string;

  @IsOptional()
  @Matches(ISO_WITH_OFFSET, { message: ISO_MESSAGE })
  plannedDepartureAt?: string;

  @IsOptional()
  @Matches(ISO_WITH_OFFSET, { message: ISO_MESSAGE })
  plannedReturnStartAt?: string;

  @IsOptional()
  @Matches(ISO_WITH_OFFSET, { message: ISO_MESSAGE })
  plannedReturnEndAt?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason?: string;
}

export class CancelTripDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class CompanionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  relationship?: string;
}

export class AddPatientDto {
  @IsUUID()
  patientId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  appointmentLocationName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  appointmentAddress!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  appointmentMunicipality!: string;

  @Matches(ISO_WITH_OFFSET, { message: ISO_MESSAGE })
  appointmentAt!: string;

  @IsEnum(Priority)
  priority!: Priority;

  /** D-013: prioridade é registrada com justificativa. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  priorityJustification!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CompanionDto)
  companions?: CompanionDto[];
}

export class UpdatePatientTripDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  appointmentLocationName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  appointmentAddress?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  appointmentMunicipality?: string;

  @IsOptional()
  @Matches(ISO_WITH_OFFSET, { message: ISO_MESSAGE })
  appointmentAt?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  /** Obrigatória sempre que `priority` for informada. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  priorityJustification?: string;
}

export class ListTripsQueryDto {
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @IsOptional()
  @Matches(ISO_WITH_OFFSET, { message: ISO_MESSAGE })
  from?: string;

  @IsOptional()
  @Matches(ISO_WITH_OFFSET, { message: ISO_MESSAGE })
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
