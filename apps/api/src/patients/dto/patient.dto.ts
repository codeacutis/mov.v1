import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePatientDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsDateString()
  birthDate!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(15)
  susCardNumber?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  usesWheelchair?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasReducedMobility?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  needsBoardingAssistance?: boolean;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  operationalNotes?: string;
}

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}
