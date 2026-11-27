import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ type: String, maxLength: 200 })
  @IsString()
  @Matches(/\S/)
  @MaxLength(200)
  appointmentLocationName!: string;

  @ApiProperty({ type: String, maxLength: 300 })
  @IsString()
  @Matches(/\S/)
  @MaxLength(300)
  appointmentAddress!: string;

  @ApiProperty({ type: String, maxLength: 100 })
  @IsString()
  @Matches(/\S/)
  @MaxLength(100)
  appointmentMunicipality!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsISO8601()
  appointmentAt!: string;

  @ApiProperty({ enum: Priority })
  @IsEnum(Priority)
  priority!: Priority;

  @ApiProperty({
    type: String,
    maxLength: 500,
    description:
      'Obrigatória ao definir ou alterar prioridade; sem diagnóstico clínico.',
  })
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  priorityJustification!: string;
}

export class UpdatePatientTripDto {
  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(200)
  appointmentLocationName?: string;

  @ApiPropertyOptional({ type: String, maxLength: 300 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(300)
  appointmentAddress?: string;

  @ApiPropertyOptional({ type: String, maxLength: 100 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(100)
  appointmentMunicipality?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsISO8601()
  appointmentAt?: string;

  @ApiPropertyOptional({ enum: Priority })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({
    type: String,
    maxLength: 500,
    description:
      'Obrigatória ao definir ou alterar prioridade; sem diagnóstico clínico.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  priorityJustification?: string;

  @ApiPropertyOptional({ enum: ConfirmationStatus })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(ConfirmationStatus)
  confirmationStatus?: ConfirmationStatus;
}

export class UpdateOutboundStatusDto {
  @ApiProperty({ enum: OutboundStatus })
  @IsEnum(OutboundStatus)
  status!: OutboundStatus;
}

export class UpdateReturnStatusDto {
  @ApiProperty({ enum: ReturnStatus })
  @IsEnum(ReturnStatus)
  status!: ReturnStatus;

  @ApiPropertyOptional({
    type: String,
    maxLength: 500,
    description:
      'Justificativa operacional obrigatória nos casos descritos na operação.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  reason?: string;
}

export class CancelPatientTripDto {
  @ApiProperty({
    type: String,
    maxLength: 500,
    description:
      'Justificativa operacional obrigatória nos casos descritos na operação.',
  })
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  reason!: string;
}
