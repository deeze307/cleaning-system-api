import { IsOptional, IsPositive, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;
}