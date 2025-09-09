import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { TaskStatus } from '../../../common/interfaces/user.interface';

export class QueryTasksDto extends PaginationDto {
  @ApiProperty({
    description: 'Filtrar por habitación',
    required: false,
  })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiProperty({
    description: 'Filtrar por edificio',
    required: false,
  })
  @IsOptional()
  @IsString()
  buildingId?: string;

  @ApiProperty({
    description: 'Filtrar por estado',
    enum: TaskStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    description: 'Filtrar por mucama asignada',
    required: false,
  })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiProperty({
    description: 'Fecha desde (formato ISO)',
    example: '2024-12-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    description: 'Fecha hasta (formato ISO)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({
    description: 'Filtrar por empresa (solo super admins)',
    required: false,
  })
  @IsOptional()
  @IsString()
  companyId?: string;
}