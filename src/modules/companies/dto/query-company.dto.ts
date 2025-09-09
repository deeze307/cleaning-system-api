import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { CompanyPlan } from '../../../common/interfaces/user.interface';

export class QueryCompanyDto extends PaginationDto {
  @ApiProperty({
    description: 'Filtrar por plan',
    enum: CompanyPlan,
    required: false,
  })
  @IsOptional()
  @IsEnum(CompanyPlan)
  plan?: CompanyPlan;

  @ApiProperty({
    description: 'Filtrar por estado activo',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiProperty({
    description: 'Buscar por nombre (búsqueda parcial)',
    example: 'Plaza',
    required: false,
  })
  @IsOptional()
  search?: string;
}