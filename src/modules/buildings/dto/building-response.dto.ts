import { ApiProperty } from '@nestjs/swagger';
import { BuildingType } from '../../../common/interfaces/user.interface';

export class BuildingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: BuildingType })
  type: BuildingType;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  floors?: number;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  totalRooms: number;

  @ApiProperty()
  activeRooms: number;

  @ApiProperty()
  pendingTasks: number;

  @ApiProperty()
  completedTasksToday: number;
}