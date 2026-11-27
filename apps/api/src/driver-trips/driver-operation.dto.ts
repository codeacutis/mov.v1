import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({
    type: String,
    maxLength: 500,
    description:
      'Obrigatória para NO_SHOW no retorno pelo motorista. Descrever a tentativa de contato, sem informação clínica.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  contactAttempt?: string;
}

export class DriverObservationDto {
  @ApiProperty({ enum: TripObservationType })
  @IsEnum(TripObservationType)
  type!: TripObservationType;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description:
      'ID da participação na mesma viagem; obrigatório para CONTACT_ATTEMPT.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID()
  patientTripId?: string;

  @ApiProperty({ type: String, maxLength: 500 })
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  description!: string;
}
