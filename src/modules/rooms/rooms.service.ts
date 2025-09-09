import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FirebaseConfigService } from '../../config/firebase.config';
import { BuildingsService } from '../buildings/buildings.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomsDto } from './dto/query-rooms.dto';
import { RoomResponseDto } from './dto/room-response.dto';
import type { Room, User } from '../../common/interfaces/user.interface';
import { UserRole } from '../../common/interfaces/user.interface';

@Injectable()
export class RoomsService {
  private readonly roomsCollection = 'rooms';
  private readonly tasksCollection = 'tasks';

  constructor(
    private firebaseConfig: FirebaseConfigService,
    private buildingsService: BuildingsService,
  ) {}

  async create(createRoomDto: CreateRoomDto, createdBy: User): Promise<RoomResponseDto> {
    const firestore = this.firebaseConfig.firestore;
    
    // Verificar que el edificio existe y que el usuario tiene permisos
    const building = await this.buildingsService.findOne(createRoomDto.buildingId, createdBy);

    // Solo admins y super admins pueden crear habitaciones
    if (createdBy.role === UserRole.MAID) {
      throw new ForbiddenException('No tenés permisos para crear habitaciones');
    }

    // Verificar que no existe otra habitación con el mismo nombre en el edificio
    const existingRoom = await firestore
      .collection(this.roomsCollection)
      .where('buildingId', '==', createRoomDto.buildingId)
      .where('name', '==', createRoomDto.name)
      .where('isActive', '==', true)
      .get();

    if (!existingRoom.empty) {
      throw new BadRequestException('Ya existe una habitación con este nombre en el edificio');
    }

    // Validar configuración de camas
    if (createRoomDto.bedConfiguration.kingBeds === 0 && createRoomDto.bedConfiguration.individualBeds === 0) {
      throw new BadRequestException('La habitación debe tener al menos una cama');
    }

    const now = new Date();
    const roomData: Omit<Room, 'id'> = {
      buildingId: createRoomDto.buildingId,
      name: createRoomDto.name,
      bedConfiguration: createRoomDto.bedConfiguration,
      floor: createRoomDto.floor,
      area: createRoomDto.area,
      description: createRoomDto.description,
      cleaningNotes: createRoomDto.cleaningNotes,
      isActive: createRoomDto.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await firestore
      .collection(this.roomsCollection)
      .add(roomData);

    return {
      id: docRef.id,
      buildingName: building.name,
      companyId: building.companyId,
      companyName: building.companyName,
      totalTasks: 0,
      pendingTasks: 0,
      completedTasksToday: 0,
      bedSummary: this.generateBedSummary(createRoomDto.bedConfiguration),
      ...roomData,
    };
  }

  async findAll(queryDto: QueryRoomsDto, requestUser: User): Promise<{
    rooms: RoomResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const firestore = this.firebaseConfig.firestore;
    
    let query = firestore
      .collection(this.roomsCollection)
      .orderBy('createdAt', 'desc');

    // Aplicar filtros
    if (queryDto.buildingId) {
      // Verificar que el usuario tenga acceso al edificio
      await this.buildingsService.findOne(queryDto.buildingId, requestUser);
      query = query.where('buildingId', '==', queryDto.buildingId);
    }

    if (queryDto.floor !== undefined) {
      query = query.where('floor', '==', queryDto.floor);
    }

    if (queryDto.isActive !== undefined) {
      query = query.where('isActive', '==', queryDto.isActive);
    }

    const snapshot = await query.get();
    let rooms = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const roomData = doc.data() as Room;
        
        // Verificar permisos por empresa si no se especificó buildingId
        if (!queryDto.buildingId) {
          try {
            await this.buildingsService.findOne(roomData.buildingId, requestUser);
          } catch (error) {
            return null; // Filtrar habitaciones a las que no tiene acceso
          }
        }
        
        // Obtener información del edificio y estadísticas
        const [building, stats] = await Promise.all([
          this.buildingsService.findOne(roomData.buildingId, requestUser),
          this.getRoomStats(doc.id),
        ]);

        const { id: _, ...roomDataWithoutId } = roomData;
        return {
          id: doc.id,
          buildingName: building.name,
          companyId: building.companyId,
          companyName: building.companyName,
          bedSummary: this.generateBedSummary(roomData.bedConfiguration),
          ...roomDataWithoutId,
          ...stats,
        } as RoomResponseDto;
      })
    );

    // Filtrar habitaciones nulas (sin acceso)
    const validRooms = rooms.filter((room): room is RoomResponseDto => room !== null);

    // Filtrar por búsqueda de texto
    let filteredRooms = validRooms;
    if (queryDto.search) {
      const searchTerm = queryDto.search.toLowerCase();
      filteredRooms = validRooms.filter(room => {
        const nameMatch = room.name.toLowerCase().includes(searchTerm);
        const descriptionMatch = room.description?.toLowerCase().includes(searchTerm) || false;
        
        return nameMatch || descriptionMatch;
      });
    }

    const total = filteredRooms.length;
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedRooms = filteredRooms.slice(startIndex, endIndex);
    const totalPages = Math.ceil(total / limit);

    return {
      rooms: paginatedRooms,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string, requestUser: User): Promise<RoomResponseDto> {
    const firestore = this.firebaseConfig.firestore;
    const doc = await firestore.collection(this.roomsCollection).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException('Habitación no encontrada');
    }

    const roomData = doc.data() as Room;

    // Verificar permisos a través del edificio
    const building = await this.buildingsService.findOne(roomData.buildingId, requestUser);

    // Obtener estadísticas
    const stats = await this.getRoomStats(id);

    const { id: _, ...roomDataWithoutId } = roomData;
    return {
      id: doc.id,
      buildingName: building.name,
      companyId: building.companyId,
      companyName: building.companyName,
      bedSummary: this.generateBedSummary(roomData.bedConfiguration),
      ...roomDataWithoutId,
      ...stats,
    };
  }

  async update(id: string, updateRoomDto: UpdateRoomDto, requestUser: User): Promise<RoomResponseDto> {
    const firestore = this.firebaseConfig.firestore;
    const docRef = firestore.collection(this.roomsCollection).doc(id);
    
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Habitación no encontrada');
    }

    const roomData = doc.data() as Room;

    // Verificar permisos
    await this.buildingsService.findOne(roomData.buildingId, requestUser);

    if (requestUser.role === UserRole.MAID) {
      // Las mucamas solo pueden actualizar cleaningNotes
      const allowedFields = ['cleaningNotes'];
      const hasInvalidField = Object.keys(updateRoomDto).some(key => !allowedFields.includes(key));
      
      if (hasInvalidField) {
        throw new ForbiddenException('Solo podés modificar las notas de limpieza');
      }
    }

    // Si se cambia el nombre, verificar que no exista otro con el mismo nombre
    if (updateRoomDto.name && updateRoomDto.name !== roomData.name) {
      const existingRoom = await firestore
        .collection(this.roomsCollection)
        .where('buildingId', '==', roomData.buildingId)
        .where('name', '==', updateRoomDto.name)
        .where('isActive', '==', true)
        .get();

      const conflictingRoom = existingRoom.docs.find(d => d.id !== id);
      if (conflictingRoom) {
        throw new BadRequestException('Ya existe una habitación con este nombre en el edificio');
      }
    }

    // Validar configuración de camas si se actualiza
    if (updateRoomDto.bedConfiguration) {
      if (updateRoomDto.bedConfiguration.kingBeds === 0 && updateRoomDto.bedConfiguration.individualBeds === 0) {
        throw new BadRequestException('La habitación debe tener al menos una cama');
      }
    }

    const updateData = {
      ...updateRoomDto,
      updatedAt: new Date(),
    };

    await docRef.update(updateData);

    return this.findOne(id, requestUser);
  }

  async remove(id: string, requestUser: User): Promise<void> {
    const firestore = this.firebaseConfig.firestore;
    const docRef = firestore.collection(this.roomsCollection).doc(id);
    
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Habitación no encontrada');
    }

    const roomData = doc.data() as Room;

    // Verificar permisos
    await this.buildingsService.findOne(roomData.buildingId, requestUser);

    if (requestUser.role === UserRole.MAID) {
      throw new ForbiddenException('No tenés permisos para eliminar habitaciones');
    }

    // Verificar si tiene tareas pendientes
    const pendingTasksSnapshot = await firestore
      .collection(this.tasksCollection)
      .where('roomId', '==', id)
      .where('status', 'in', ['pending', 'urgent', 'in_progress'])
      .get();

    if (!pendingTasksSnapshot.empty) {
      throw new BadRequestException(
        'No se puede eliminar la habitación porque tiene tareas pendientes. Completá o cancelá todas las tareas primero.'
      );
    }

    // Soft delete
    await docRef.update({
      isActive: false,
      updatedAt: new Date(),
    });
  }

  async getRoomsByBuilding(buildingId: string, requestUser: User): Promise<RoomResponseDto[]> {
    // Verificar acceso al edificio
    const building = await this.buildingsService.findOne(buildingId, requestUser);

    const firestore = this.firebaseConfig.firestore;
    const snapshot = await firestore
      .collection(this.roomsCollection)
      .where('buildingId', '==', buildingId)
      .where('isActive', '==', true)
      .orderBy('name', 'asc')
      .get();

    return Promise.all(
      snapshot.docs.map(async (doc) => {
        const roomData = doc.data() as Room;
        const stats = await this.getRoomStats(doc.id);
        
        const { id: _, ...roomDataWithoutId } = roomData;
        return {
          id: doc.id,
          buildingName: building.name,
          companyId: building.companyId,
          companyName: building.companyName,
          bedSummary: this.generateBedSummary(roomData.bedConfiguration),
          ...roomDataWithoutId,
          ...stats,
        };
      })
    );
  }

  // Método útil para obtener habitaciones en formato simple (para selects)
  async getRoomsSelectOptions(buildingId: string, requestUser: User): Promise<{ id: string; name: string; bedSummary: string }[]> {
    // Verificar acceso al edificio
    await this.buildingsService.findOne(buildingId, requestUser);

    const firestore = this.firebaseConfig.firestore;
    const snapshot = await firestore
      .collection(this.roomsCollection)
      .where('buildingId', '==', buildingId)
      .where('isActive', '==', true)
      .orderBy('name', 'asc')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data() as Room;
      return {
        id: doc.id,
        name: data.name,
        bedSummary: this.generateBedSummary(data.bedConfiguration),
      };
    });
  }

  private async getRoomStats(roomId: string): Promise<{
    totalTasks: number;
    pendingTasks: number;
    completedTasksToday: number;
    lastCleanedAt?: Date;
    lastCleanedBy?: string;
  }> {
    const firestore = this.firebaseConfig.firestore;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalTasksSnapshot, pendingTasksSnapshot, completedTodaySnapshot, lastCleanedSnapshot] = await Promise.all([
      firestore.collection(this.tasksCollection).where('roomId', '==', roomId).get(),
      firestore.collection(this.tasksCollection)
        .where('roomId', '==', roomId)
        .where('status', 'in', ['pending', 'urgent', 'in_progress'])
        .get(),
      firestore.collection(this.tasksCollection)
        .where('roomId', '==', roomId)
        .where('status', 'in', ['completed', 'verified'])
        .where('completedAt', '>=', today)
        .where('completedAt', '<', tomorrow)
        .get(),
      firestore.collection(this.tasksCollection)
        .where('roomId', '==', roomId)
        .where('status', 'in', ['completed', 'verified'])
        .orderBy('completedAt', 'desc')
        .limit(1)
        .get(),
    ]);

    let lastCleanedAt: Date | undefined;
    let lastCleanedBy: string | undefined;

    if (!lastCleanedSnapshot.empty) {
      const lastTask = lastCleanedSnapshot.docs[0].data();
      lastCleanedAt = lastTask.completedAt?.toDate();
      lastCleanedBy = lastTask.completedBy;
    }

    return {
      totalTasks: totalTasksSnapshot.size,
      pendingTasks: pendingTasksSnapshot.size,
      completedTasksToday: completedTodaySnapshot.size,
      lastCleanedAt,
      lastCleanedBy,
    };
  }

  private generateBedSummary(bedConfiguration: { kingBeds: number; individualBeds: number }): string {
    const parts: string[] = [];
    
    if (bedConfiguration.kingBeds > 0) {
      parts.push(`${bedConfiguration.kingBeds} King`);
    }
    
    if (bedConfiguration.individualBeds > 0) {
      parts.push(`${bedConfiguration.individualBeds} Individual`);
    }
    
    return parts.join(' + ') || 'Sin camas';
  }
}