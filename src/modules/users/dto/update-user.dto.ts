import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString } from 'class-validator';

// Omitir password y email del update por seguridad
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['passwordHash', 'email'] as const)
) {
    @ApiPropertyOptional({ example: 'hashedPasswordHere' })
    @IsOptional()
    @IsString()
    passwordHash?: string;

    @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
    @IsOptional()
    @IsString()
    lastLoginAt?: string;
    
    @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
    @IsOptional()
    @IsString()
    updatedAt?: string;
}