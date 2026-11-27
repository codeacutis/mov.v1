import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateBy,
} from 'class-validator';
import { isValidCns } from '../../common/cns';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePatientDto {
  @ApiProperty({ type: String, maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  birthDate!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 20 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 15, description: 'CNS opcional: 15 dígitos com verificador válido conforme e-SUS APS. Aceita máscara com espaços e normaliza para dígitos; vazio limpa o campo.' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().replace(/ /g, '') : value)
  @IsString()
  @MaxLength(15)
  @ValidateBy({ name: 'isCns', validator: { validate: (value: unknown) => value === '' || (typeof value === 'string' && isValidCns(value)), defaultMessage: () => 'Informe um Cartão SUS válido com 15 dígitos ou deixe o campo vazio' } })
  susCardNumber?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 300 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  usesWheelchair?: boolean;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasReducedMobility?: boolean;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  needsBoardingAssistance?: boolean;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 500,
    description:
      'Somente observações operacionais necessárias ao transporte; não incluir diagnósticos.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  operationalNotes?: string;
}

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}
