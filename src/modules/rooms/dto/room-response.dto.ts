import { ApiProperty } from '@nestjs/swagger';
import type { BedConfiguration } from '../../../common/interfaces/user.interface';

export class RoomResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  buildingId: string;

  @ApiProperty()
  buildingName: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  bedConfiguration: BedConfiguration;

  @ApiProperty({ required: false })
  floor?: number;

  @ApiProperty({ required: false })
  area?: number;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  cleaningNotes?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  pendingTasks: number;

  @ApiProperty()
  completedTasksToday: number;

  @ApiProperty()
  lastCleanedAt?: Date;

  @ApiProperty()
  lastCleanedBy?: string;

  @ApiProperty()
  bedSummary: string; // "1 King + 2 Individual"
}