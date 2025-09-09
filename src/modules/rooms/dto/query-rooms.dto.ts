import { IsOptional, IsBoolean, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryRoomsDto extends PaginationDto {
  @ApiProperty({
    description: 'Filtrar por edificio',
    required: false,
  })
  @IsOptional()
  @IsString()
  buildingId?: string;

  @ApiProperty({
    description: 'Filtrar por piso',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  floor?: number;

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
    description: 'Buscar por nombre',
    example: '101',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filtrar por empresa (solo super admins)',
    required: false,
  })
  @IsOptional()
  @IsString()
  companyId?: string;
}