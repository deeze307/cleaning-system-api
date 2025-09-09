import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import { UserRole, TaskStatus } from '../../common/interfaces/user.interface';

@ApiTags('tasks')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Crear nueva tarea de limpieza',
    description: 'Crear tarea y opcionalmente asignar a una mucama'
  })
  @ApiResponse({
    status: 201,
    description: 'Tarea creada exitosamente',
    type: TaskResponseDto,
  })
  create(@Body() createTaskDto: CreateTaskDto, @CurrentUser() user: User): Promise<TaskResponseDto> {
    return this.tasksService.create(createTaskDto, user);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MAID)
  @ApiOperation({ summary: 'Obtener lista de tareas' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'roomId', required: false, type: String })
  @ApiQuery({ name: 'buildingId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'assignedTo', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  findAll(@Query() queryDto: QueryTasksDto, @CurrentUser() user: User) {
    return this.tasksService.findAll(queryDto, user);
  }

  @Get('my-tasks')
  @Roles(UserRole.MAID)
  @ApiOperation({ 
    summary: 'Obtener tareas asignadas a la mucama actual',
    description: 'Retorna tareas asignadas y sin asignar disponibles para tomar'
  })
  getMyTasks(@CurrentUser() user: User) {
    return this.tasksService.getMyTasks(user);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MAID)
  @ApiOperation({ summary: 'Obtener tarea por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: User): Promise<TaskResponseDto> {
    return this.tasksService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Actualizar tarea',
    description: 'Solo admins pueden modificar tareas. Mucamas deben usar endpoints específicos.'
  })
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: User,
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(id, updateTaskDto, user);
  }

  @Patch(':id/complete')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MAID)
  @ApiOperation({ 
    summary: 'Completar tarea',
    description: 'Marcar tarea como completada con observaciones e imágenes'
  })
  completeTask(
    @Param('id') id: string,
    @Body() completeTaskDto: CompleteTaskDto,
    @CurrentUser() user: User,
  ): Promise<TaskResponseDto> {
    return this.tasksService.completeTask(id, completeTaskDto, user);
  }

  @Patch(':id/start')
  @Roles(UserRole.MAID)
  @ApiOperation({ 
    summary: 'Marcar tarea como en progreso',
    description: 'Solo mucamas pueden marcar tareas como en progreso'
  })
  markAsInProgress(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<TaskResponseDto> {
    return this.tasksService.markAsInProgress(id, user);
  }

  @Patch(':id/verify')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Verificar tarea completada',
    description: 'Solo admins pueden verificar tareas'
  })
  verifyTask(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<TaskResponseDto> {
    return this.tasksService.verifyTask(id, user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Eliminar tarea',
    description: 'Solo se pueden eliminar tareas no completadas'
  })
  remove(@Param('id') id: string, @CurrentUser() user: User): Promise<void> {
    return this.tasksService.remove(id, user);
  }

  @Post('upload-image')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MAID)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Subir imagen para tarea',
    description: 'Subir imagen del estado de la habitación durante limpieza'
  })
  @ApiResponse({
    status: 201,
    description: 'Imagen subida exitosamente',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://storage.googleapis.com/bucket/image.jpg' }
      }
    }
  })
  uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /^image\/(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.tasksService.uploadImage(file);
  }
}