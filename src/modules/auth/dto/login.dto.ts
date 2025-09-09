import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Correo electrónico',
    example: 'admin@hotelplaza.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña',
    example: 'Password123!',
  })
  @IsString()
  password: string;
}