import { IsString, IsEmail, MinLength, MaxLength, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, CompanyPlan } from '../../../common/interfaces/user.interface';

export class RegisterDto {
  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'admin@hotelplaza.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'Password123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Rol del usuario',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsEnum(UserRole)
  role: UserRole;

  // Para crear empresa junto con el primer admin
  @ApiProperty({
    description: 'Nombre de la empresa (solo para admins)',
    example: 'Hotel Plaza S.A.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  companyName?: string;

  @ApiProperty({
    description: 'Descripción de la empresa (opcional)',
    example: 'Cadena hotelera boutique',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  companyDescription?: string;

  @ApiProperty({
    description: 'Plan de la empresa (solo para admins)',
    enum: CompanyPlan,
    example: CompanyPlan.BASIC,
    required: false,
  })
  @IsOptional()
  @IsEnum(CompanyPlan)
  companyPlan?: CompanyPlan;

  // Para asignar mucamas a empresas existentes
  @ApiProperty({
    description: 'ID de empresa existente (solo para mucamas)',
    example: 'company123',
    required: false,
  })
  @IsOptional()
  @IsString()
  companyId?: string;
}