import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Correo electrónico para resetear contraseña',
    example: 'admin@hotelplaza.com',
  })
  @IsEmail()
  email: string;
}