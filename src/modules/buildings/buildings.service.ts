import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FirebaseConfigService } from '../../config/firebase.config';
import { CompaniesService } from '../companies/companies.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { QueryBuildingsDto } from './dto/query-buildings.dto';
import { BuildingResponseDto } from './dto/building-response.dto';
import type { Building, User } from '../../common/interfaces/user.interface';
import { UserRole } from '../../common/interfaces/user.interface';

@Injectable()
export class BuildingsService {
  private readonly buildingsCollection = 'buildings';
  private readonly roomsCollection = 'rooms';
  private readonly tasksCollection = 'tasks';

  constructor(
    private firebaseConfig: FirebaseConfigService,
    private companiesService: CompaniesService,
  ) {}

  async create(createBuildingDto: CreateBuildingDto, createdBy: User): Promise<BuildingResponseDto> {
    const firestore = this.firebaseConfig.firestore;
    
    // Determinar la empresa del edificio
    let targetCompanyId = createBuildingDto.companyId;
    
    if (createdBy.role === UserRole.SUPER_ADMIN) {
      if (!targetCompanyId) {
        throw new BadRequestException('Super admin debe especificar una empresa');
      }
    } else if (createdBy.role === UserRole.ADMIN) {
      targetCompanyId = createdBy.companyId;
    } else {
      throw new ForbiddenException('No tenés permisos para crear edificios');
    }

    // Verificar que la empresa existe
    const company = await this.companiesService.findOne(targetCompanyId);

    // Verificar límite de edificios según el plan
    const currentBuildingsSnapshot = await firestore
      .collection(this.buildingsCollection)
      .where('companyId', '==', targetCompanyId)
      .where('isActive', '==', true)
      .get();

    if (currentBuildingsSnapshot.size >= company.maxBuildings) {
      throw new BadRequestException(
        `Has alcanzado el límite de ${company.maxBuildings} edificios para tu plan. Actualizá tu plan o desactivá edificios existentes.`
      );
    }

    // Verificar que no existe otro edificio con el mismo nombre en la empresa
    const existingBuilding = await firestore
      .collection(this.buildingsCollection)
      .where('companyId', '==', targetCompanyId)
      .where('name', '==', createBuildingDto.name)
      .where('isActive', '==', true)
      .get();

    if (!existingBuilding.empty) {
      throw new BadRequestException('Ya existe un edificio con este nombre en tu empresa');
    }

    const now = new Date();
    const buildingData: Omit<Building, 'id'> = {
      companyId: targetCompanyId,
      name: createBuildingDto.name,
      type: createBuildingDto.type,
      address: createBuildingDto.address,
      description: createBuildingDto.description,
      floors: createBuildingDto.floors,
      phone: createBuildingDto.phone,
      email: createBuildingDto.email,
      isActive: createBuildingDto.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await firestore
      .collection(this.buildingsCollection)
      .add(buildingData);

    return {
      id: docRef.id,
      companyName: company.name,
      totalRooms: 0,
      activeRooms: 0,
      pendingTasks: 0,
      completedTasksToday: 0,
      ...buildingData,
    };
  }

  async findAll(queryDto: QueryBuildingsDto, requestUser: User): Promise<{
    buildings: BuildingResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const firestore = this.firebaseConfig.firestore;
    
    // Determinar filtro de empresa según el rol
    let companyFilter = queryDto.companyId;
    
    if (requestUser.role === UserRole.ADMIN || requestUser.role === UserRole.MAID) {
      companyFilter = requestUser.companyId;
    }

    let query = firestore
      .collection(this.buildingsCollection)
      .orderBy('createdAt', 'desc');

    // Aplicar filtros
    if (companyFilter) {
      query = query.where('companyId', '==', companyFilter);
    }

    if (queryDto.type) {
      query = query.where('type', '==', queryDto.type);
    }

    if (queryDto.isActive !== undefined) {
      query = query.where('isActive', '==', queryDto.isActive);
    }

    const snapshot = await query.get();
    let buildings = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const buildingData = doc.data() as Building;
        
        // Obtener estadísticas del edificio
        const stats = await this.getBuildingStats(doc.id);
        
        // Obtener nombre de la empresa
        let companyName = 'Sistema';
        try {
          const company = await this.companiesService.findOne(buildingData.companyId);
          companyName = company.name;
        } catch (error) {
          console.error('Error fetching company for building:', doc.id, error);
        }

        const { id: _, ...buildingDataWithoutId } = buildingData;
        return {
          id: doc.id,
          companyName,
          ...buildingDataWithoutId,
          ...stats,
        } as BuildingResponseDto;
      })
    );

    // Filtrar por búsqueda de texto
    if (queryDto.search) {
      const searchTerm = queryDto.search.toLowerCase();
      buildings = buildings.filter(building =>
        building.name.toLowerCase().includes(searchTerm) ||
        building.address?.toLowerCase().includes(searchTerm) ||
        building.description?.toLowerCase().includes(searchTerm)
      );
    }

    const total = buildings.length;
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedBuildings = buildings.slice(startIndex, endIndex);
    const totalPages = Math.ceil(total / limit);

    return {
      buildings: paginatedBuildings,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string, requestUser: User): Promise<BuildingResponseDto> {
    const firestore = this.firebaseConfig.firestore;
    const doc = await firestore
      .collection(this.buildingsCollection)
      .doc(id)
      .get();

    if (!doc.exists) {
      throw new NotFoundException('Edificio no encontrado');
    }

    const buildingData = doc.data() as Building;

    // Verificar permisos
    if (requestUser.role === UserRole.ADMIN || requestUser.role === UserRole.MAID) {
      if (buildingData.companyId !== requestUser.companyId) {
        throw new ForbiddenException('No tenés acceso a edificios de otras empresas');
      }
    }

    // Obtener estadísticas y nombre de empresa
    const [stats, company] = await Promise.all([
      this.getBuildingStats(id),
      this.companiesService.findOne(buildingData.companyId),
    ]);

    const { id: _, ...buildingDataWithoutId } = buildingData;
    return {
      id: doc.id,
      companyName: company.name,
      ...buildingDataWithoutId,
      ...stats,
    };
  }

  async update(id: string, updateBuildingDto: UpdateBuildingDto, requestUser: User): Promise<BuildingResponseDto> {
    const firestore = this.firebaseConfig.firestore;
    const docRef = firestore.collection(this.buildingsCollection).doc(id);
    
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Edificio no encontrado');
    }

    const buildingData = doc.data() as Building;

    // Verificar permisos
    if (requestUser.role === UserRole.ADMIN && buildingData.companyId !== requestUser.companyId) {
      throw new ForbiddenException('No podés modificar edificios de otras empresas');
    }

    if (requestUser.role === UserRole.MAID) {
      throw new ForbiddenException('No tenés permisos para modificar edificios');
    }

    // Si se cambia el nombre, verificar que no exista otro con el mismo nombre
    if (updateBuildingDto.name && updateBuildingDto.name !== buildingData.name) {
      const existingBuilding = await firestore
        .collection(this.buildingsCollection)
        .where('companyId', '==', buildingData.companyId)
        .where('name', '==', updateBuildingDto.name)
        .where('isActive', '==', true)
        .get();

      const conflictingBuilding = existingBuilding.docs.find(d => d.id !== id);
      if (conflictingBuilding) {
        throw new BadRequestException('Ya existe un edificio con este nombre en tu empresa');
      }
    }

    const updateData = {
      ...updateBuildingDto,
      updatedAt: new Date(),
    };

    await docRef.update(updateData);

    return this.findOne(id, requestUser);
  }

  async remove(id: string, requestUser: User): Promise<void> {
    const firestore = this.firebaseConfig.firestore;
    const docRef = firestore.collection(this.buildingsCollection).doc(id);
    
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Edificio no encontrado');
    }

    const buildingData = doc.data() as Building;

    // Verificar permisos
    if (requestUser.role === UserRole.ADMIN && buildingData.companyId !== requestUser.companyId) {
      throw new ForbiddenException('No podés eliminar edificios de otras empresas');
    }

    if (requestUser.role === UserRole.MAID) {
      throw new ForbiddenException('No tenés permisos para eliminar edificios');
    }

    // Verificar si tiene habitaciones activas
    const roomsSnapshot = await firestore
      .collection(this.roomsCollection)
      .where('buildingId', '==', id)
      .where('isActive', '==', true)
      .get();

    if (!roomsSnapshot.empty) {
      throw new BadRequestException(
        'No se puede eliminar el edificio porque tiene habitaciones activas. Primero desactivá todas las habitaciones.'
      );
    }

    // Soft delete
    await docRef.update({
      isActive: false,
      updatedAt: new Date(),
    });
  }

  async getBuildingsByCompany(companyId: string, requestUser: User): Promise<BuildingResponseDto[]> {
    // Verificar permisos
    if (requestUser.role === UserRole.ADMIN && requestUser.companyId !== companyId) {
      throw new ForbiddenException('No podés ver edificios de otras empresas');
    }

    const firestore = this.firebaseConfig.firestore;
    const snapshot = await firestore
      .collection(this.buildingsCollection)
      .where('companyId', '==', companyId)
      .where('isActive', '==', true)
      .orderBy('name', 'asc')
      .get();

    const company = await this.companiesService.findOne(companyId);

    return Promise.all(
      snapshot.docs.map(async (doc) => {
        const buildingData = doc.data() as Building;
        const stats = await this.getBuildingStats(doc.id);
        const { id: _, ...buildingDataWithoutId } = buildingData;
        
        return {
          id: doc.id,
          companyName: company.name,
          ...buildingDataWithoutId,
          ...stats,
        };
      })
    );
  }

  private async getBuildingStats(buildingId: string): Promise<{
    totalRooms: number;
    activeRooms: number;
    pendingTasks: number;
    completedTasksToday: number;
  }> {
    const firestore = this.firebaseConfig.firestore;
    
    // Contar habitaciones
    const [totalRoomsSnapshot, activeRoomsSnapshot] = await Promise.all([
      firestore.collection(this.roomsCollection).where('buildingId', '==', buildingId).get(),
      firestore.collection(this.roomsCollection)
        .where('buildingId', '==', buildingId)
        .where('isActive', '==', true)
        .get(),
    ]);

    const totalRooms = totalRoomsSnapshot.size;
    const activeRooms = activeRoomsSnapshot.size;

    // Contar tareas pendientes y completadas hoy
    let pendingTasks = 0;
    let completedTasksToday = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const roomDoc of activeRoomsSnapshot.docs) {
      const [pendingTasksSnapshot, completedTodaySnapshot] = await Promise.all([
        firestore.collection(this.tasksCollection)
          .where('roomId', '==', roomDoc.id)
          .where('status', 'in', ['pending', 'urgent', 'in_progress'])
          .get(),
        firestore.collection(this.tasksCollection)
          .where('roomId', '==', roomDoc.id)
          .where('status', 'in', ['completed', 'verified'])
          .where('completedAt', '>=', today)
          .where('completedAt', '<', tomorrow)
          .get(),
      ]);

      pendingTasks += pendingTasksSnapshot.size;
      completedTasksToday += completedTodaySnapshot.size;
    }

    return {
      totalRooms,
      activeRooms,
      pendingTasks,
      completedTasksToday,
    };
  }

  // Método útil para obtener edificios en formato simple (para selects)
  async getBuildingsSelectOptions(requestUser: User): Promise<{ id: string; name: string; type: string }[]> {
    const firestore = this.firebaseConfig.firestore;
    
    let companyId = requestUser.companyId;
    if (requestUser.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Super admin debe especificar una empresa');
    }

    const snapshot = await firestore
      .collection(this.buildingsCollection)
      .where('companyId', '==', companyId)
      .where('isActive', '==', true)
      .orderBy('name', 'asc')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data() as Building;
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
      };
    });
  }
}