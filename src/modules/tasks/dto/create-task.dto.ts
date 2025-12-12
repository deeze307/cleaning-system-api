import { IsString, IsOptional, IsEnum, IsDateString, IsArray, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../../../common/interfaces/user.interface';

export class CreateTaskDto {
  @ApiProperty({
    description: 'ID de la habitación',
    example: 'room123',
  })
  @IsString()
  roomId: string;

  @ApiProperty({
    description: 'Fecha programada para la tarea',
    example: '2024-12-15T10:00:00Z',
  })
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({
    description: 'Estado inicial de la tarea',
    enum: TaskStatus,
    example: TaskStatus.TO_CLEAN,
    default: TaskStatus.TO_CLEAN,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus = TaskStatus.TO_CLEAN;

  @ApiProperty({
    description: 'ID de la mucama asignada (opcional)',
    example: 'user123',
    required: false,
  })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiProperty({
    description: 'Observaciones iniciales',
    example: 'Revisar especialmente el baño',
    required: false,
  })
  @IsOptional()
  @IsString()
  observations?: string;
}