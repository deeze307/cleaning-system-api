import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, MinLength, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CompanyPlan } from '../../../common/interfaces/user.interface';

export class CreateCompanyDto {
  @ApiProperty({
    description: 'Nombre de la empresa',
    example: 'Hotel Plaza',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Descripción de la empresa',
    example: 'Cadena hotelera con 5 establecimientos',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Plan de la empresa',
    enum: CompanyPlan,
    example: CompanyPlan.BASIC,
  })
  @IsEnum(CompanyPlan)
  plan: CompanyPlan;

  @ApiProperty({
    description: 'Máximo número de edificios permitidos',
    example: 5,
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  maxBuildings: number;

  @ApiProperty({
    description: 'Estado activo de la empresa',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}