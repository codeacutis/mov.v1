import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CorrectActualTimesDto {
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  @IsOptional()
  @IsDateString({ strict: true })
  actualDepartureAt?: string;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  @IsOptional()
  @IsDateString({ strict: true })
  actualReturnStartAt?: string;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  @IsOptional()
  @IsDateString({ strict: true })
  actualReturnAt?: string;
  @ApiProperty({
    type: String,
    minLength: 1,
    maxLength: 500,
    description:
      'Justificativa operacional obrigatória nos casos descritos na operação.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
