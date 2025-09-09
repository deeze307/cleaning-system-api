import { IsString, IsOptional, IsArray, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteTaskDto {
  @ApiProperty({
    description: 'Observaciones al completar la tarea',
    example: 'Habitación limpia correctamente. Se cambió ropa de cama.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observations?: string;

  @ApiProperty({
    description: 'URLs de imágenes del estado de la habitación',
    example: ['https://storage.googleapis.com/bucket/image1.jpg'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];
}