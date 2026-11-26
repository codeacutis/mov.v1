import {
  IsEnum,
  IsISO8601,
  Matches,
  ValidateIf,
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
  @Matches(/\S/)
  @MaxLength(200)
  appointmentLocationName!: string;

  @IsString()
  @Matches(/\S/)
  @MaxLength(300)
  appointmentAddress!: string;

  @IsString()
  @Matches(/\S/)
  @MaxLength(100)
  appointmentMunicipality!: string;

  @IsISO8601()
  appointmentAt!: string;

  @IsEnum(Priority)
  priority!: Priority;

  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  priorityJustification!: string;
}

export class UpdatePatientTripDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(200)
  appointmentLocationName?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(300)
  appointmentAddress?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(100)
  appointmentMunicipality?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsISO8601()
  appointmentAt?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(Priority)
  priority?: Priority;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  priorityJustification?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
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

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  reason?: string;
}

export class CancelPatientTripDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  reason!: string;
}
