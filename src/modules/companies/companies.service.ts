import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirestoreService } from '../../firestore/firestore.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { QueryCompanyDto } from './dto/query-company.dto';
import { Company } from '../../common/interfaces/user.interface';

@Injectable()
export class CompaniesService {
  private readonly companiesCollection = 'companies';

  constructor(private firestoreService: FirestoreService) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    // Verificar si ya existe una empresa con el mismo nombre
    const existingCompanies = await this.firestoreService.findByField<Company>(
      this.companiesCollection,
      'name',
      createCompanyDto.name
    );

    const activeCompany = existingCompanies.find(c => c.isActive);
    if (activeCompany) {
      throw new BadRequestException('Ya existe una empresa con este nombre');
    }

    const now = new Date().toISOString();
    const companyData = {
      name: createCompanyDto.name,
      description: createCompanyDto.description,
      plan: createCompanyDto.plan,
      maxBuildings: createCompanyDto.maxBuildings,
      isActive: createCompanyDto.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.firestoreService.create(this.companiesCollection, companyData);

    return {
      id: docRef.id,
      ...companyData,
    } as Company;
  }

  async findAll(queryDto: QueryCompanyDto): Promise<{
    companies: Company[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    let companies = await this.firestoreService.findAll<Company>(this.companiesCollection);

    // Aplicar filtros
    if (queryDto.plan) {
      companies = companies.filter(c => c.plan === queryDto.plan);
    }

    if (queryDto.isActive !== undefined) {
      companies = companies.filter(c => c.isActive === queryDto.isActive);
    }

    // Filtrar por búsqueda de texto
    if (queryDto.search) {
      const searchTerm = queryDto.search.toLowerCase();
      companies = companies.filter(c =>
        c.name.toLowerCase().includes(searchTerm) ||
        c.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Ordenar por createdAt descendente
    companies.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    // Paginación
    const total = companies.length;
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedCompanies = companies.slice(startIndex, endIndex);
    const totalPages = Math.ceil(total / limit);

    return {
      companies: paginatedCompanies,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.firestoreService.findById<Company>(
      this.companiesCollection,
      id
    );

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    // Verificar si existe
    const existingCompany = await this.firestoreService.findById<Company>(
      this.companiesCollection,
      id
    );

    if (!existingCompany) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Si se está cambiando el nombre, verificar que no exista otro con el mismo nombre
    if (updateCompanyDto.name && updateCompanyDto.name !== existingCompany.name) {
      const companiesWithSameName = await this.firestoreService.findByField<Company>(
        this.companiesCollection,
        'name',
        updateCompanyDto.name
      );

      const conflictingCompany = companiesWithSameName.find(c => c.id !== id && c.isActive);
      if (conflictingCompany) {
        throw new BadRequestException('Ya existe una empresa con este nombre');
      }
    }

    const updateData = {
      ...updateCompanyDto,
      updatedAt: new Date().toISOString(),
    };

    await this.firestoreService.update(this.companiesCollection, id, updateData);

    const updatedCompany = await this.firestoreService.findById<Company>(
      this.companiesCollection,
      id
    );

    return updatedCompany!;
  }

  async remove(id: string): Promise<void> {
    // Verificar si existe
    const company = await this.firestoreService.findById<Company>(
      this.companiesCollection,
      id
    );

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Verificar si tiene edificios activos
    const buildings = await this.firestoreService.findByField<any>(
      'buildings',
      'companyId',
      id
    );

    const activeBuildings = buildings.filter(b => b.isActive);
    if (activeBuildings.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar la empresa porque tiene edificios activos. Primero desactive todos los edificios.'
      );
    }

    // Soft delete
    await this.firestoreService.update(this.companiesCollection, id, {
      isActive: false,
      updatedAt: new Date().toISOString(),
    });
  }

  async getCompanyStats(companyId: string): Promise<{
    totalBuildings: number;
    totalRooms: number;
    totalUsers: number;
    totalTasks: number;
    tasksCompleted: number;
    tasksPending: number;
  }> {
    // Obtener edificios de la empresa
    const buildings = await this.firestoreService.findByField<any>(
      'buildings',
      'companyId',
      companyId
    );
    const activeBuildings = buildings.filter(b => b.isActive);
    const totalBuildings = activeBuildings.length;

    // Obtener usuarios de la empresa
    const users = await this.firestoreService.findByField<any>(
      'users',
      'companyId',
      companyId
    );
    const activeUsers = users.filter(u => u.isActive);
    const totalUsers = activeUsers.length;

    // Contar habitaciones
    let totalRooms = 0;
    const buildingIds = activeBuildings.map(b => b.id);
    
    for (const buildingId of buildingIds) {
      const rooms = await this.firestoreService.findByField<any>(
        'rooms',
        'buildingId',
        buildingId
      );
      totalRooms += rooms.filter(r => r.isActive).length;
    }

    // Contar tareas del último mes
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    let totalTasks = 0;
    let tasksCompleted = 0;
    let tasksPending = 0;

    for (const buildingId of buildingIds) {
      const rooms = await this.firestoreService.findByField<any>(
        'rooms',
        'buildingId',
        buildingId
      );
      const activeRooms = rooms.filter(r => r.isActive);

      for (const room of activeRooms) {
        const tasks = await this.firestoreService.findByField<any>(
          'tasks',
          'roomId',
          room.id
        );

        // Filtrar tareas del último mes
        const recentTasks = tasks.filter(t => {
          const taskDate = new Date(t.createdAt);
          return taskDate >= lastMonth;
        });

        totalTasks += recentTasks.length;

        recentTasks.forEach(task => {
          if (task.status === 'completed' || task.status === 'verified') {
            tasksCompleted++;
          } else {
            tasksPending++;
          }
        });
      }
    }

    return {
      totalBuildings,
      totalRooms,
      totalUsers,
      totalTasks,
      tasksCompleted,
      tasksPending,
    };
  }
}