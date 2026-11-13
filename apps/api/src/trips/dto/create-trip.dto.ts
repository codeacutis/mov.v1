import { Transform, Type } from 'class-transformer';
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
  @IsUUID()
  vehicleId!: string;

  @IsUUID()
  driverId!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  municipalPickupPoint!: string;

  @IsDateString()
  plannedDepartureAt!: string;

  @IsDateString()
  plannedReturnStartAt!: string;
}
