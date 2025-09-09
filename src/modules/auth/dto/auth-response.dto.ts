import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/interfaces/user.interface';

export class AuthResponseDto {
  @ApiProperty({
    description: 'ID único del usuario',
    example: 'firebase-uid-123',
  })
  uid: string;

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

  @ApiProperty({
    description: 'ID de la empresa',
    example: 'company123',
  })
  companyId: string;

  @ApiProperty({
    description: 'Nombre de la empresa',
    example: 'Hotel Plaza S.A.',
  })
  companyName: string;

  @ApiProperty({
    description: 'Token de acceso de Firebase',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Estado activo del usuario',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}