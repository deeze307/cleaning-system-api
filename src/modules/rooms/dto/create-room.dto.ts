import { IsString, IsOptional, IsBoolean, MinLength, MaxLength, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BedConfigurationDto {
  @ApiProperty({
    description: 'Número de camas King',
    example: 1,
    minimum: 0,
    maximum: 10,
  })
  @IsNumber()
  @Min(0)
  @Max(10)
  kingBeds: number;

  @ApiProperty({
    description: 'Número de camas individuales',
    example: 2,
    minimum: 0,
    maximum: 20,
  })
  @IsNumber()
  @Min(0)
  @Max(20)
  individualBeds: number;

  @ApiProperty({
    description: 'Descripción adicional de la configuración de camas',
    example: 'Cama King en dormitorio principal, individuales en segundo dormitorio',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

export class CreateRoomDto {
  @ApiProperty({
    description: 'Nombre/número de la habitación',
    example: 'Habitación 101',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: 'ID del edificio al que pertenece',
    example: 'building123',
  })
  @IsString()
  buildingId: string;

  @ApiProperty({
    description: 'Configuración de camas',
    type: BedConfigurationDto,
  })
  @ValidateNested()
  @Type(() => BedConfigurationDto)
  bedConfiguration: BedConfigurationDto;

  @ApiProperty({
    description: 'Número de piso (opcional)',
    example: 1,
    minimum: 0,
    maximum: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  floor?: number;

  @ApiProperty({
    description: 'Área en metros cuadrados (opcional)',
    example: 25.5,
    minimum: 1,
    maximum: 500,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  area?: number;

  @ApiProperty({
    description: 'Descripción adicional de la habitación',
    example: 'Suite con vista al mar, balcón privado',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({
    description: 'Notas especiales para limpieza',
    example: 'Usar productos hipoalergénicos, revisar minibar',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  cleaningNotes?: string;

  @ApiProperty({
    description: 'Estado activo de la habitación',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}