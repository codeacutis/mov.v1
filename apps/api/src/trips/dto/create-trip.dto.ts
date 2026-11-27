import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateTripDto {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  driverId!: string;

  @ApiProperty({ type: String, maxLength: 300 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  municipalPickupPoint!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  plannedDepartureAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  plannedReturnStartAt!: string;
}
