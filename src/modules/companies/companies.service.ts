import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseConfigService } from '../../config/firebase.config';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { QueryCompanyDto } from './dto/query-company.dto';
import { Company } from '../../common/interfaces/user.interface';

@Injectable()
export class CompaniesService {
  private readonly companiesCollection = 'companies';

  constructor(private firebaseConfig: FirebaseConfigService) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const firestore = this.firebaseConfig.firestore;
    
    // Verificar si ya existe una empresa con el mismo nombre
    const existingCompany = await firestore
      .collection(this.companiesCollection)
      .where('name', '==', createCompanyDto.name)
      .where('isActive', '==', true)
      .get();

    if (!existingCompany.empty) {
      throw new BadRequestException('Ya existe una empresa con este nombre');
    }

    const now = new Date();
    const companyData: Omit<Company, 'id'> = {
      name: createCompanyDto.name,
      description: createCompanyDto.description,
      plan: createCompanyDto.plan,
      maxBuildings: createCompanyDto.maxBuildings,
      isActive: createCompanyDto.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await firestore
      .collection(this.companiesCollection)
      .add(companyData);

    return {
      id: docRef.id,
      ...companyData,
    };
  }

  async findAll(queryDto: QueryCompanyDto): Promise<{
    companies: Company[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const firestore = this.firebaseConfig.firestore;
    let query = firestore.collection(this.companiesCollection).orderBy('createdAt', 'desc');

    // Aplicar filtros
    if (queryDto.plan) {
      query = query.where('plan', '==', queryDto.plan);
    }

    if (queryDto.isActive !== undefined) {
      query = query.where('isActive', '==', queryDto.isActive);
    }

    // Obtener todos los documentos para contar y filtrar por búsqueda
    const snapshot = await query.get();
    let companies = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Company[];

    // Filtrar por búsqueda de texto (Firestore no tiene búsqueda de texto completo)
    if (queryDto.search) {
      const searchTerm = queryDto.search.toLowerCase();
      companies = companies.filter(company =>
        company.name.toLowerCase().includes(searchTerm) ||
        company.description?.toLowerCase().includes(searchTerm)
      );
    }

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
    const firestore = this.firebaseConfig.firestore;
    const doc = await firestore
      .collection(this.companiesCollection)
      .doc(id)
      .get();

    if (!doc.exists) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as Company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const firestore = this.firebaseConfig.firestore;
    const docRef = firestore.collection(this.companiesCollection).doc(id);
    
    // Verificar si existe
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Si se está cambiando el nombre, verificar que no exista otro con el mismo nombre
    if (updateCompanyDto.name) {
      const existingCompany = await firestore
        .collection(this.companiesCollection)
        .where('name', '==', updateCompanyDto.name)
        .where('isActive', '==', true)
        .get();

      const conflictingCompany = existingCompany.docs.find(d => d.id !== id);
      if (conflictingCompany) {
        throw new BadRequestException('Ya existe una empresa con este nombre');
      }
    }

    const updateData = {
      ...updateCompanyDto,
      updatedAt: new Date(),
    };

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as Company;
  }

  async remove(id: string): Promise<void> {
    const firestore = this.firebaseConfig.firestore;
    
    // Soft delete - marcar como inactivo
    const docRef = firestore.collection(this.companiesCollection).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Verificar si tiene edificios activos
    const buildingsSnapshot = await firestore
      .collection('buildings')
      .where('companyId', '==', id)
      .where('isActive', '==', true)
      .get();

    if (!buildingsSnapshot.empty) {
      throw new BadRequestException(
        'No se puede eliminar la empresa porque tiene edificios activos. Primero desactive todos los edificios.'
      );
    }

    await docRef.update({
      isActive: false,
      updatedAt: new Date(),
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
    const firestore = this.firebaseConfig.firestore;

    // Obtener estadísticas en paralelo
    const [buildingsSnapshot, usersSnapshot] = await Promise.all([
      firestore
        .collection('buildings')
        .where('companyId', '==', companyId)
        .where('isActive', '==', true)
        .get(),
      firestore
        .collection('users')
        .where('companyId', '==', companyId)
        .where('isActive', '==', true)
        .get(),
    ]);

    const totalBuildings = buildingsSnapshot.size;
    const totalUsers = usersSnapshot.size;

    // Contar habitaciones
    let totalRooms = 0;
    for (const buildingDoc of buildingsSnapshot.docs) {
      const roomsSnapshot = await firestore
        .collection('rooms')
        .where('buildingId', '==', buildingDoc.id)
        .where('isActive', '==', true)
        .get();
      totalRooms += roomsSnapshot.size;
    }

    // Contar tareas del último mes
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    let totalTasks = 0;
    let tasksCompleted = 0;
    let tasksPending = 0;

    for (const buildingDoc of buildingsSnapshot.docs) {
      const roomsSnapshot = await firestore
        .collection('rooms')
        .where('buildingId', '==', buildingDoc.id)
        .where('isActive', '==', true)
        .get();

      for (const roomDoc of roomsSnapshot.docs) {
        const tasksSnapshot = await firestore
          .collection('tasks')
          .where('roomId', '==', roomDoc.id)
          .where('createdAt', '>=', lastMonth)
          .get();

        totalTasks += tasksSnapshot.size;

        tasksSnapshot.docs.forEach(taskDoc => {
          const taskData = taskDoc.data();
          if (taskData.status === 'completed' || taskData.status === 'verified') {
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