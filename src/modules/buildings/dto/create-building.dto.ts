import { IsString, IsOptional, IsEnum, IsBoolean, MinLength, MaxLength, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BuildingType } from '../../../common/interfaces/user.interface';

export class CreateBuildingDto {
  @ApiProperty({
    description: 'Nombre del edificio',
    example: 'Hotel Plaza Centro',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Tipo de edificio',
    enum: BuildingType,
    example: BuildingType.HOTEL,
  })
  @IsEnum(BuildingType)
  type: BuildingType;

  @ApiProperty({
    description: 'Dirección del edificio',
    example: 'Av. San Martín 123, Ushuaia',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiProperty({
    description: 'Descripción del edificio',
    example: 'Hotel boutique de 4 estrellas en el centro de la ciudad',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Número de pisos',
    example: 5,
    minimum: 1,
    maximum: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  floors?: number;

  @ApiProperty({
    description: 'Teléfono de contacto',
    example: '+542901234567',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Email de contacto',
    example: 'info@hotelplaza.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Estado activo del edificio',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiProperty({
    description: 'ID de empresa (solo super admins pueden especificar)',
    required: false,
  })
  @IsOptional()
  @IsString()
  companyId?: string;
}