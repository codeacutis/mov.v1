import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  ConfirmationStatus,
  OutboundStatus,
  Priority,
  ReturnStatus,
} from '../../generated/prisma/client';

export class CreatePatientTripDto {
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

  @IsISO8601()
  appointmentAt!: string;

  @IsEnum(Priority)
  priority!: Priority;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  priorityJustification!: string;
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
  @IsISO8601()
  appointmentAt?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  priorityJustification?: string;

  @IsOptional()
  @IsEnum(ConfirmationStatus)
  confirmationStatus?: ConfirmationStatus;
}

export class UpdateOutboundStatusDto {
  @IsEnum(OutboundStatus)
  status!: OutboundStatus;
}

export class UpdateReturnStatusDto {
  @IsEnum(ReturnStatus)
  status!: ReturnStatus;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason?: string;
}
