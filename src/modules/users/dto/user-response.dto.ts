// src/users/dto/user-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/interfaces/user.interface';

export class UserResponseDto {
  @ApiProperty({
    description: 'ID único del usuario',
    example: 'user123',
  })
  id: string;

  @ApiProperty({
    description: 'Correo electrónico',
    example: 'admin@hotelplaza.com',
  })
  email: string;

  @ApiProperty({
    description: 'Nombre completo',
    example: 'Juan Pérez',
  })
  name: string;

  @ApiProperty({
    description: 'Rol del usuario',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  role: UserRole;

  @ApiPropertyOptional({
    description: 'ID de la empresa',
    example: 'company123',
  })
  companyId?: string;

  @ApiProperty({
    description: 'Estado activo del usuario',
    example: true,
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Fecha del último login',
    example: '2024-01-15T10:30:00Z',
  })
  lastLoginAt?: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Fecha de actualización',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: string;
}