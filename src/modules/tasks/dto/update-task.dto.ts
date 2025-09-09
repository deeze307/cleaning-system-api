import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

// No permitir cambiar roomId una vez creada la tarea
export class UpdateTaskDto extends PartialType(
  OmitType(CreateTaskDto, ['roomId'] as const)
) {}