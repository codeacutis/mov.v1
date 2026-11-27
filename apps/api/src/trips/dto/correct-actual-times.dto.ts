import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CorrectActualTimesDto {
  @IsOptional() @IsDateString({ strict: true }) actualDepartureAt?: string;
  @IsOptional() @IsDateString({ strict: true }) actualReturnStartAt?: string;
  @IsOptional() @IsDateString({ strict: true }) actualReturnAt?: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(500) reason!: string;
}
