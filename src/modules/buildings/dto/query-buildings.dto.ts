import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { BuildingType } from '../../../common/interfaces/user.interface';

export class QueryBuildingsDto extends PaginationDto {
  @ApiProperty({
    description: 'Filtrar por tipo de edificio',
    enum: BuildingType,
    required: false,
  })
  @IsOptional()
  @IsEnum(BuildingType)
  type?: BuildingType;

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
    description: 'Filtrar por empresa (solo super admins)',
    required: false,
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({
    description: 'Buscar por nombre o dirección',
    example: 'Plaza',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}