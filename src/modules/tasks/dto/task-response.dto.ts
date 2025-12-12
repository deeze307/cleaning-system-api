import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../../../common/interfaces/user.interface';

export class TaskResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  roomId: string;

  @ApiProperty()
  roomName: string;

  @ApiProperty()
  buildingId: string;

  @ApiProperty()
  buildingName: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty({ required: false })
  assignedTo?: string;

  @ApiProperty({ required: false })
  assignedToName?: string;

  @ApiProperty()
  scheduledDate: string;

  @ApiProperty({ enum: TaskStatus })
  status: TaskStatus;

  @ApiProperty({ required: false })
  completedAt?: string;

  @ApiProperty({ required: false })
  completedBy?: string;

  @ApiProperty({ required: false })
  completedByName?: string;

  @ApiProperty({ required: false })
  observations?: string;

  @ApiProperty({ type: [String], required: false })
  images?: string[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty()
  isOverdue: boolean;

  @ApiProperty()
  bedSummary: string;
}