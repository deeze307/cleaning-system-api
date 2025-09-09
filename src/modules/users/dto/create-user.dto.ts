import { IsString, IsEmail, MinLength, MaxLength, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/interfaces/user.interface';

export class CreateUserDto {
  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'mucama@hotelplaza.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña temporal (será cambiada en primer login)',
    example: 'TempPass123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'María González',
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
    example: UserRole.MAID,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    description: 'Teléfono del usuario (opcional)',
    example: '+549114567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Estado activo del usuario',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiProperty({
    description: 'ID de empresa (solo super admins pueden especificar, otros usan su empresa)',
    required: false,
  })
  @IsOptional()
  @IsString()
  companyId?: string;
}