import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FirebaseConfigService } from '../../config/firebase.config';
import { RoomsService } from '../rooms/rooms.service';
import { UsersService } from '../users/users.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import type { CleaningTask, User } from '../../common/interfaces/user.interface';
import { UserRole, TaskStatus } from '../../common/interfaces/user.interface';
import { UserResponseDto } from '../users/dto/user-response.dto';

@Injectable()
export class TasksService {
  private readonly tasksCollection = 'tasks';

  constructor(
    private firebaseConfig: FirebaseConfigService,
    private roomsService: RoomsService,
    private usersService: UsersService,
  ) {}

  async create(createTaskDto: CreateTaskDto, createdBy: User): Promise<TaskResponseDto> {
    const firestore = this.firebaseConfig.firestore;
    
    // Solo admins y super admins pueden crear tareas
    if (createdBy.role === UserRole.CLEANER) {
      throw new ForbiddenException('No tenés permisos para crear tareas');
    }

    // Verificar que la habitación existe y que el usuario tiene acceso
    const room = await this.roomsService.findOne(createTaskDto.roomId, createdBy);

    // Si se asigna a una mucama, verificar que existe y pertenece a la misma empresa
    let assignedToUser: UserResponseDto | null = null;
    if (createTaskDto.assignedTo) {
      assignedToUser = await this.usersService.findOne(createTaskDto.assignedTo, createdBy);
      
      if (assignedToUser.role !== UserRole.CLEANER) {
        throw new BadRequestException('Solo se puede asignar tareas a mucamas');
      }
      
      if (assignedToUser.companyId !== room.companyId) {
        throw new BadRequestException('La mucama debe pertenecer a la misma empresa');
      }
    }

    const now = new Date().toISOString();
    const taskDate = new Date(createTaskDto.scheduledDate).toISOString();
    
    const taskData: Omit<CleaningTask, 'id'> = {
      roomId: createTaskDto.roomId,
      assignedTo: createTaskDto.assignedTo,
      scheduledDate: taskDate,
      status: createTaskDto.status || TaskStatus.TO_CLEAN,
      observations: createTaskDto.observations,
      images: [],
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await firestore
      .collection(this.tasksCollection)
      .add(taskData);

    return {
      id: docRef.id,
      roomName: room.name,
      buildingId: room.buildingId,
      buildingName: room.buildingName,
      companyId: room.companyId,
      companyName: room.companyName,
      assignedToName: assignedToUser?.name,
      isOverdue: this.isTaskOverdue(taskDate, taskData.status),
      bedSummary: room.bedSummary,
      ...taskData,
    };
  }

  async findAll(queryDto: QueryTasksDto, requestUser: User): Promise<{
    tasks: TaskResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const firestore = this.firebaseConfig.firestore;
    
    let query = firestore
      .collection(this.tasksCollection)
      .orderBy('scheduledDate', 'desc');

    // Aplicar filtros
    if (queryDto.roomId) {
      // Verificar acceso a la habitación
      await this.roomsService.findOne(queryDto.roomId, requestUser);
      query = query.where('roomId', '==', queryDto.roomId);
    }

    if (queryDto.status) {
      query = query.where('status', '==', queryDto.status);
    }

    if (queryDto.assignedTo) {
      query = query.where('assignedTo', '==', queryDto.assignedTo);
    }

    if (queryDto.dateFrom) {
      query = query.where('scheduledDate', '>=', new Date(queryDto.dateFrom));
    }

    if (queryDto.dateTo) {
      query = query.where('scheduledDate', '<=', new Date(queryDto.dateTo));
    }

    const snapshot = await query.get();
    let tasks = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const taskData = doc.data() as CleaningTask;
        
        try {
          // Obtener información de la habitación
          const room = await this.roomsService.findOne(taskData.roomId, requestUser);
          
          // Filtrar por edificio si se especifica
          if (queryDto.buildingId && room.buildingId !== queryDto.buildingId) {
            return null;
          }

          // Para mucamas, solo mostrar sus propias tareas o tareas sin asignar de su empresa
          if (requestUser.role === UserRole.CLEANER) {
            const isAssignedToMe = taskData.assignedTo === requestUser.id;
            const isUnassigned = !taskData.assignedTo && room.companyId === requestUser.companyId;
            
            if (!isAssignedToMe && !isUnassigned) {
              return null;
            }
          }

          // Obtener nombres de usuarios asignados
          let assignedToName: string | undefined = undefined;
          let completedByName: string | undefined = undefined;

          if (taskData.assignedTo) {
            try {
              const assignedUser = await this.usersService.findOne(taskData.assignedTo, requestUser);
              assignedToName = assignedUser.name;
            } catch (error) {
              // Usuario puede haber sido eliminado
            }
          }

          if (taskData.completedBy) {
            try {
              const completedUser = await this.usersService.findOne(taskData.completedBy, requestUser);
              completedByName = completedUser.name;
            } catch (error) {
              // Usuario puede haber sido eliminado
            }
          }

          const { id: _, ...taskDataWithoutId } = taskData;
          return {
            id: doc.id,
            roomName: room.name,
            buildingId: room.buildingId,
            buildingName: room.buildingName,
            companyId: room.companyId,
            companyName: room.companyName,
            assignedToName,
            completedByName,
            isOverdue: this.isTaskOverdue(taskData.scheduledDate, taskData.status),
            bedSummary: room.bedSummary,
            ...taskDataWithoutId,
          } as TaskResponseDto;
        } catch (error) {
          // Sin acceso a la habitación
          return null;
        }
      })
    );

    // Filtrar tareas nulas (sin acceso)
    const validTasks = tasks.filter((task): task is TaskResponseDto => task !== null);

    const total = validTasks.length;
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedTasks = validTasks.slice(startIndex, endIndex);
    const totalPages = Math.ceil(total / limit);

    return {
      tasks: paginatedTasks,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string, requestUser: User): Promise<TaskResponseDto> {
    const firestore = this.firebaseConfig.firestore;
    const doc = await firestore.collection(this.tasksCollection).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const taskData = doc.data() as CleaningTask;

    // Verificar acceso a través de la habitación
    const room = await this.roomsService.findOne(taskData.roomId, requestUser);

    // Para mucamas, verificar que es su tarea o una sin asignar de su empresa
    if (requestUser.role === UserRole.CLEANER) {
      const isAssignedToMe = taskData.assignedTo === requestUser.id;
      const isUnassigned = !taskData.assignedTo && room.companyId === requestUser.companyId;
      
      if (!isAssignedToMe && !isUnassigned) {
        throw new ForbiddenException('No tenés acceso a esta tarea');
      }
    }

    // Obtener nombres de usuarios
    let assignedToName: string | undefined = undefined;
    let completedByName: string | undefined = undefined;

    if (taskData.assignedTo) {
      try {
        const assignedUser = await this.usersService.findOne(taskData.assignedTo, requestUser);
        assignedToName = assignedUser.name;
      } catch (error) {
        // Usuario puede haber sido eliminado
      }
    }

    if (taskData.completedBy) {
      try {
        const completedUser = await this.usersService.findOne(taskData.completedBy, requestUser);
        completedByName = completedUser.name;
      } catch (error) {
        // Usuario puede haber sido eliminado
      }
    }

    const { id: _, ...taskDataWithoutId } = taskData;
    return {
      id: doc.id,
      roomName: room.name,
      buildingId: room.buildingId,
      buildingName: room.buildingName,
      companyId: room.companyId,
      companyName: room.companyName,
      assignedToName,
      completedByName,
      isOverdue: this.isTaskOverdue(taskData.scheduledDate, taskData.status),
      bedSummary: room.bedSummary,
      ...taskDataWithoutId,
    };
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, requestUser: User): Promise<TaskResponseDto> {
    const firestore = this.firebaseConfig.firestore;
    const docRef = firestore.collection(this.tasksCollection).doc(id);
    
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const taskData = doc.data() as CleaningTask;

    // Verificar acceso
    const task = await this.findOne(id, requestUser);

    // Las mucamas no pueden modificar tareas, solo completarlas
    if (requestUser.role === UserRole.CLEANER) {
      throw new ForbiddenException('Las mucamas no pueden modificar tareas. Usá el endpoint de completar tarea.');
    }

    // Si se cambia la asignación, verificar la mucama
    if (updateTaskDto.assignedTo) {
      const assignedUser = await this.usersService.findOne(updateTaskDto.assignedTo, requestUser);
      
      if (assignedUser.role !== UserRole.CLEANER) {
        throw new BadRequestException('Solo se puede asignar tareas a mucamas');
      }
      
      if (assignedUser.companyId !== task.companyId) {
        throw new BadRequestException('La mucama debe pertenecer a la misma empresa');
      }
    }

    const updateData = {
      ...updateTaskDto,
      updatedAt: new Date(),
    };

    await docRef.update(updateData);

    return this.findOne(id, requestUser);
  }

  async completeTask(id: string, completeTaskDto: CompleteTaskDto, requestUser: User): Promise<TaskResponseDto> {
    const firestore = this.firebaseConfig.firestore;
    const docRef = firestore.collection(this.tasksCollection).doc(id);
    
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const taskData = doc.data() as CleaningTask;
    const task = await this.findOne(id, requestUser);

    // Para mucamas, verificar que es su tarea asignada o una sin asignar que pueden tomar
    if (requestUser.role === UserRole.CLEANER) {
      const isAssignedToMe = taskData.assignedTo === requestUser.id;
      const isUnassigned = !taskData.assignedTo && task.companyId === requestUser.companyId;
      
      if (!isAssignedToMe && !isUnassigned) {
        throw new ForbiddenException('No podés completar esta tarea');
      }
    }

    // Verificar que la tarea no esté ya completada
    if (taskData.status === TaskStatus.COMPLETED || taskData.status === TaskStatus.VERIFIED) {
      throw new BadRequestException('La tarea ya está completada');
    }

    const now = new Date();
    const updateData = {
      status: TaskStatus.COMPLETED,
      completedAt: now,
      completedBy: requestUser.id,
      observations: completeTaskDto.observations || taskData.observations,
      images: completeTaskDto.images || taskData.images || [],
      assignedTo: taskData.assignedTo || requestUser.id, // Asignar automáticamente si no estaba asignada
      updatedAt: now,
    };

    await docRef.update(updateData);

    return this.findOne(id, requestUser);
  }

  async markAsInProgress(id: string, requestUser: User): Promise<TaskResponseDto> {
    const firestore = this.firebaseConfig.firestore;
    const docRef = firestore.collection(this.tasksCollection).doc(id);
    
    const task = await this.findOne(id, requestUser);

    // Solo mucamas pueden marcar como en progreso
    if (requestUser.role !== UserRole.CLEANER) {
      throw new ForbiddenException('Solo las mucamas pueden marcar tareas como en progreso');
    }

    // Verificar que es su tarea o una sin asignar
    const taskDoc = await docRef.get();
    const taskData = taskDoc.data() as CleaningTask;
    
    const isAssignedToMe = taskData.assignedTo === requestUser.id;
    const isUnassigned = !taskData.assignedTo && task.companyId === requestUser.companyId;
    
    if (!isAssignedToMe && !isUnassigned) {
      throw new ForbiddenException('No podés marcar esta tarea como en progreso');
    }

    if (taskData.status !== TaskStatus.TO_CLEAN && taskData.status !== TaskStatus.TO_CLEAN_URGENT && taskData.status !== TaskStatus.URGENT) {
      throw new BadRequestException('Solo se pueden marcar como en progreso las tareas pendientes o urgentes');
    }

    const updateData = {
      status: TaskStatus.IN_PROGRESS,
      assignedTo: taskData.assignedTo || requestUser.id, // Asignar automáticamente si no estaba asignada
      updatedAt: new Date(),
    };

    await docRef.update(updateData);

    return this.findOne(id, requestUser);
  }

  async verifyTask(id: string, requestUser: User): Promise<TaskResponseDto> {
    // Solo admins pueden verificar tareas
    if (requestUser.role !== UserRole.ADMIN && requestUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Solo los administradores pueden verificar tareas');
    }

    const firestore = this.firebaseConfig.firestore;
    const docRef = firestore.collection(this.tasksCollection).doc(id);
    
    const task = await this.findOne(id, requestUser);

    if (task.status !== TaskStatus.COMPLETED) {
      throw new BadRequestException('Solo se pueden verificar tareas completadas');
    }

    const updateData = {
      status: TaskStatus.VERIFIED,
      updatedAt: new Date(),
    };

    await docRef.update(updateData);

    return this.findOne(id, requestUser);
  }

  async remove(id: string, requestUser: User): Promise<void> {
    const firestore = this.firebaseConfig.firestore;
    
    // Solo admins pueden eliminar tareas
    if (requestUser.role === UserRole.CLEANER) {
      throw new ForbiddenException('No tenés permisos para eliminar tareas');
    }

    const task = await this.findOne(id, requestUser);

    // No permitir eliminar tareas completadas/verificadas
    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.VERIFIED) {
      throw new BadRequestException('No se pueden eliminar tareas completadas o verificadas');
    }

    await firestore.collection(this.tasksCollection).doc(id).delete();
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    const storage = this.firebaseConfig.storage;
    const bucket = storage.bucket();
    
    // Generar nombre único para el archivo
    const fileName = `task-images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.originalname}`;
    const fileUpload = bucket.file(fileName);
    
    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    return new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('finish', async () => {
        // Hacer el archivo público
        await fileUpload.makePublic();
        
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        resolve({ url: publicUrl });
      });
      
      stream.end(file.buffer);
    });
  }

  async getMyTasks(requestUser: User): Promise<TaskResponseDto[]> {
    if (requestUser.role !== UserRole.CLEANER) {
      throw new ForbiddenException('Solo las mucamas pueden ver sus tareas asignadas');
    }

    const firestore = this.firebaseConfig.firestore;
    
    // Obtener tareas asignadas a la mucama
    const assignedTasksSnapshot = await firestore
      .collection(this.tasksCollection)
      .where('assignedTo', '==', requestUser.id)
      .where('status', 'in', [TaskStatus.TO_CLEAN, TaskStatus.TO_CLEAN_URGENT, TaskStatus.URGENT, TaskStatus.IN_PROGRESS])
      .orderBy('scheduledDate', 'asc')
      .get();

    // Obtener tareas sin asignar de su empresa
    const unassignedTasksSnapshot = await firestore
      .collection(this.tasksCollection)
      .where('assignedTo', '==', null)
      .where('status', 'in', [TaskStatus.TO_CLEAN, TaskStatus.TO_CLEAN_URGENT, TaskStatus.URGENT])
      .orderBy('scheduledDate', 'asc')
      .get();

    const allTaskDocs = [...assignedTasksSnapshot.docs, ...unassignedTasksSnapshot.docs];
    
    const tasks = await Promise.all(
      allTaskDocs.map(async (doc) => {
        try {
          return await this.findOne(doc.id, requestUser);
        } catch (error) {
          return null; // Filtrar tareas sin acceso
        }
      })
    );

    return tasks.filter(task => task !== null);
  }

  private isTaskOverdue(taskDate: string, status: TaskStatus): boolean {
    if (status === TaskStatus.COMPLETED || status === TaskStatus.VERIFIED) {
      return false;
    }

    const now = new Date();
    const taskDateTime = new Date(taskDate);
    
    // Comparar las fechas
    return taskDateTime < now;
  }
}