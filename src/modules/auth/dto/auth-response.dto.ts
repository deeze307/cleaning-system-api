import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/interfaces/user.interface';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Token JWT de acceso',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Datos del usuario autenticado',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'user123' },
      email: { type: 'string', example: 'admin@hotelplaza.com' },
      name: { type: 'string', example: 'Juan Pérez' },
      role: { enum: Object.values(UserRole), example: UserRole.ADMIN },
      companyId: { type: 'string', example: 'company123', nullable: true },
      isActive: { type: 'boolean', example: true },
      createdAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
      updatedAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
    }
  })
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    companyId?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}