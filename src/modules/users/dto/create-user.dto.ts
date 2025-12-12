import { IsEmail, IsString, IsEnum, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from 'src/common/interfaces/user.interface';

export class CreateUserDto {
  @ApiProperty({ example: 'admin@hotel.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'hashedPasswordHere' })
  @IsOptional()
  @IsString()
  passwordHash?: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
  @IsOptional()
  @IsString()
  lastLoginAt?: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  name: string;

  @ApiProperty({ enum: [UserRole], example: 'admin' })
  @IsEnum([UserRole])
  role: UserRole;

  @ApiPropertyOptional({ example: 'company123' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}