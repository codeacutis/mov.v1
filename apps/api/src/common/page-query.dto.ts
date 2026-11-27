import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PageQueryDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Busca textual sem distinção de maiúsculas; campos pesquisados descritos na operação.',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    type: 'integer',
    nullable: true,
    minimum: 1,
    default: 1,
    description: 'Página, iniciando em 1.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    type: 'integer',
    nullable: true,
    minimum: 1,
    maximum: 100,
    default: 20,
    description: 'Registros por página (máximo 100).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export interface PageResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
