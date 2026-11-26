import {
  IsEnum,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TripObservationType } from '../generated/prisma/client';
import { UpdateReturnStatusDto } from '../trips/dto/patient-trip.dto';

export class DriverReturnStatusDto extends UpdateReturnStatusDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  contactAttempt?: string;
}

export class DriverObservationDto {
  @IsEnum(TripObservationType)
  type!: TripObservationType;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID()
  patientTripId?: string;

  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  description!: string;
}
