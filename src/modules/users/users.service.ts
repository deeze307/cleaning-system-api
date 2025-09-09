import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FirebaseConfigService } from '../../config/firebase.config';
import { CompaniesService } from '../companies/companies.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import type { User } from '../../common/interfaces/user.interface';
import { UserRole } from '../../common/interfaces/user.interface';
import * as admin from 'firebase-admin';

@Injectable()
export class UsersService {
  private readonly usersCollection = 'users';

  constructor(
    private firebaseConfig: FirebaseConfigService,
    private companiesService: CompaniesService,
  ) {}

  async create(createUserDto: CreateUserDto, createdBy: User): Promise<UserResponseDto> {
    const { email, password, name, role, phone, isActive, companyId } = createUserDto;
    
    try {
      // Determinar la empresa del nuevo usuario
      let targetCompanyId = companyId;
      
      if (createdBy.role === UserRole.SUPER_ADMIN) {
        // Super admin puede crear usuarios en cualquier empresa
        if (!companyId) {
          throw new BadRequestException('Super admin debe especificar una empresa');
        }
        targetCompanyId = companyId;
      } else if (createdBy.role === UserRole.ADMIN) {
        // Admin solo puede crear usuarios en su propia empresa
        targetCompanyId = createdBy.companyId;
        
        // Admin no puede crear otros admins o super admins
        if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) {
          throw new ForbiddenException('No podés crear usuarios con rol de administrador');
        }
      } else {
        throw new ForbiddenException('No tenés permisos para crear usuarios');
      }

      // Verificar que la empresa existe
      const company = await this.companiesService.findOne(targetCompanyId);

      // Crear usuario en Firebase Auth
      const userRecord = await this.firebaseConfig.auth.createUser({
        email,
        password,
        displayName: name,
      });

      // Crear documento en Firestore
      const now = new Date();
      const userData: Omit<User, 'uid'> & { mustChangePassword: boolean; lastLoginAt?: Date } = {
        email,
        name,
        role,
        companyId: targetCompanyId,
        phone,
        isActive: isActive ?? true,
        mustChangePassword: true, // Forzar cambio de contraseña en primer login
        createdAt: now,
        updatedAt: now,
      };

      await this.firebaseConfig.firestore
        .collection(this.usersCollection)
        .doc(userRecord.uid)
        .set(userData);

      return {
        uid: userRecord.uid,
        email,
        name,
        role,
        companyId: targetCompanyId,
        companyName: company.name,
        phone,
        isActive: userData.isActive,
        createdAt: now,
        updatedAt: now,
        mustChangePassword: true,
      };

    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        throw new BadRequestException('Ya existe un usuario con este correo electrónico');
      }
      throw error;
    }
  }

  async findAll(queryDto: QueryUsersDto, requestUser: User): Promise<{
    users: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const firestore = this.firebaseConfig.firestore;
    
    // Determinar filtro de empresa según el rol del usuario
    let companyFilter = queryDto.companyId;
    
    if (requestUser.role === UserRole.ADMIN) {
      // Los admins solo ven usuarios de su empresa
      companyFilter = requestUser.companyId;
    } else if (requestUser.role === UserRole.MAID) {
      // Las mucamas no pueden listar usuarios
      throw new ForbiddenException('No tenés permisos para listar usuarios');
    }

    let query = firestore.collection(this.usersCollection).orderBy('createdAt', 'desc');

    // Aplicar filtros
    if (companyFilter) {
      query = query.where('companyId', '==', companyFilter);
    }

    if (queryDto.role) {
      query = query.where('role', '==', queryDto.role);
    }

    if (queryDto.isActive !== undefined) {
      query = query.where('isActive', '==', queryDto.isActive);
    }

    const snapshot = await query.get();
    let users = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const userData = doc.data() as User & { mustChangePassword?: boolean; lastLoginAt?: Date };
        
        // Obtener nombre de la empresa
        let companyName = 'Sistema';
        if (userData.companyId !== 'system') {
          try {
            const company = await this.companiesService.findOne(userData.companyId);
            companyName = company.name;
          } catch (error) {
            console.error('Error fetching company for user:', doc.id, error);
          }
        }

        return {
          uid: doc.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          companyId: userData.companyId,
          companyName,
          phone: userData.phone,
          isActive: userData.isActive,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          lastLoginAt: userData.lastLoginAt,
          mustChangePassword: userData.mustChangePassword || false,
        } as UserResponseDto;
      })
    );

    // Filtrar por búsqueda de texto
    if (queryDto.search) {
      const searchTerm = queryDto.search.toLowerCase();
      users = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    }

    const total = users.length;
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedUsers = users.slice(startIndex, endIndex);
    const totalPages = Math.ceil(total / limit);

    return {
      users: paginatedUsers,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(uid: string, requestUser: User): Promise<UserResponseDto> {
    const firestore = this.firebaseConfig.firestore;
    const doc = await firestore.collection(this.usersCollection).doc(uid).get();

    if (!doc.exists) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const userData = doc.data() as User & { mustChangePassword?: boolean; lastLoginAt?: Date };

    // Verificar permisos
    if (requestUser.role === UserRole.ADMIN && userData.companyId !== requestUser.companyId) {
      throw new ForbiddenException('No podés ver usuarios de otras empresas');
    }

    if (requestUser.role === UserRole.MAID && userData.uid !== requestUser.uid) {
      throw new ForbiddenException('Solo podés ver tu propio perfil');
    }

    // Obtener nombre de la empresa
    let companyName = 'Sistema';
    if (userData.companyId !== 'system') {
      try {
        const company = await this.companiesService.findOne(userData.companyId);
        companyName = company.name;
      } catch (error) {
        console.error('Error fetching company:', error);
      }
    }

    return {
      uid: doc.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      companyId: userData.companyId,
      companyName,
      phone: userData.phone,
      isActive: userData.isActive,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      lastLoginAt: userData.lastLoginAt,
      mustChangePassword: userData.mustChangePassword || false,
    };
  }

  async update(uid: string, updateUserDto: UpdateUserDto, requestUser: User): Promise<UserResponseDto> {
    const firestore = this.firebaseConfig.firestore;
    const docRef = firestore.collection(this.usersCollection).doc(uid);
    
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const userData = doc.data() as User;

    // Verificar permisos
    if (requestUser.role === UserRole.ADMIN) {
      if (userData.companyId !== requestUser.companyId) {
        throw new ForbiddenException('No podés modificar usuarios de otras empresas');
      }
      
      // Admin no puede cambiar roles a admin o super admin
      if (updateUserDto.role && (updateUserDto.role === UserRole.ADMIN || updateUserDto.role === UserRole.SUPER_ADMIN)) {
        throw new ForbiddenException('No podés asignar roles de administrador');
      }
    }

    if (requestUser.role === UserRole.MAID) {
      if (uid !== requestUser.uid) {
        throw new ForbiddenException('Solo podés modificar tu propio perfil');
      }
      
      // Las mucamas solo pueden cambiar datos básicos
      const allowedFields = ['name', 'phone'];
      const hasInvalidField = Object.keys(updateUserDto).some(key => !allowedFields.includes(key));
      
      if (hasInvalidField) {
        throw new ForbiddenException('Solo podés modificar tu nombre y teléfono');
      }
    }

    // Actualizar en Firestore
    const updateData = {
      ...updateUserDto,
      updatedAt: new Date(),
    };

    await docRef.update(updateData);

    // También actualizar en Firebase Auth si es necesario
    const authUpdateData: any = {};
    if (updateUserDto.name) {
      authUpdateData.displayName = updateUserDto.name;
    }

    if (Object.keys(authUpdateData).length > 0) {
      await this.firebaseConfig.auth.updateUser(uid, authUpdateData);
    }

    return this.findOne(uid, requestUser);
  }

  async remove(uid: string, requestUser: User): Promise<void> {
    const firestore = this.firebaseConfig.firestore;
    const docRef = firestore.collection(this.usersCollection).doc(uid);
    
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const userData = doc.data() as User;

    // Verificar permisos
    if (requestUser.role === UserRole.ADMIN) {
      if (userData.companyId !== requestUser.companyId) {
        throw new ForbiddenException('No podés eliminar usuarios de otras empresas');
      }
      
      if (userData.role === UserRole.ADMIN || userData.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('No podés eliminar administradores');
      }
    }

    if (requestUser.role === UserRole.MAID) {
      throw new ForbiddenException('No tenés permisos para eliminar usuarios');
    }

    // No permitir auto-eliminación
    if (uid === requestUser.uid) {
      throw new BadRequestException('No podés eliminarte a vos mismo');
    }

    // Soft delete
    await docRef.update({
      isActive: false,
      updatedAt: new Date(),
    });

    // También deshabilitar en Firebase Auth
    await this.firebaseConfig.auth.updateUser(uid, {
      disabled: true,
    });
  }

  async changePassword(uid: string, changePasswordDto: ChangePasswordDto, requestUser: User): Promise<{ message: string }> {
    // Solo el propio usuario puede cambiar su contraseña
    if (uid !== requestUser.uid) {
      throw new ForbiddenException('Solo podés cambiar tu propia contraseña');
    }

    // En un entorno real, aquí verificarías la contraseña actual
    // Por simplicidad, confiamos en que Firebase Auth ya verificó al usuario

    const { newPassword } = changePasswordDto;

    try {
      await this.firebaseConfig.auth.updateUser(uid, {
        password: newPassword,
      });

      // Marcar que ya no necesita cambiar contraseña
      await this.firebaseConfig.firestore
        .collection(this.usersCollection)
        .doc(uid)
        .update({
          mustChangePassword: false,
          updatedAt: new Date(),
        });

      return { message: 'Contraseña actualizada exitosamente' };
    } catch (error) {
      throw new BadRequestException('Error al actualizar la contraseña');
    }
  }

  async updateLastLogin(uid: string): Promise<void> {
    await this.firebaseConfig.firestore
      .collection(this.usersCollection)
      .doc(uid)
      .update({
        lastLoginAt: new Date(),
      });
  }

  async getUsersByCompany(companyId: string, requestUser: User): Promise<UserResponseDto[]> {
    // Verificar permisos
    if (requestUser.role === UserRole.ADMIN && requestUser.companyId !== companyId) {
      throw new ForbiddenException('No podés ver usuarios de otras empresas');
    }

    if (requestUser.role === UserRole.MAID) {
      throw new ForbiddenException('No tenés permisos para listar usuarios');
    }

    const firestore = this.firebaseConfig.firestore;
    const snapshot = await firestore
      .collection(this.usersCollection)
      .where('companyId', '==', companyId)
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    const company = await this.companiesService.findOne(companyId);

    return snapshot.docs.map(doc => {
      const userData = doc.data() as User & { mustChangePassword?: boolean; lastLoginAt?: Date };
      
      return {
        uid: doc.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        companyId: userData.companyId,
        companyName: company.name,
        phone: userData.phone,
        isActive: userData.isActive,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        lastLoginAt: userData.lastLoginAt,
        mustChangePassword: userData.mustChangePassword || false,
      };
    });
  }

  async getMaidsByCompany(companyId: string, requestUser: User): Promise<UserResponseDto[]> {
    // Verificar permisos - solo admins y super admins
    if (requestUser.role === UserRole.MAID) {
      throw new ForbiddenException('No tenés permisos para listar mucamas');
    }

    if (requestUser.role === UserRole.ADMIN && requestUser.companyId !== companyId) {
      throw new ForbiddenException('No podés ver mucamas de otras empresas');
    }

    const firestore = this.firebaseConfig.firestore;
    const snapshot = await firestore
      .collection(this.usersCollection)
      .where('companyId', '==', companyId)
      .where('role', '==', UserRole.MAID)
      .where('isActive', '==', true)
      .orderBy('name', 'asc')
      .get();

    const company = await this.companiesService.findOne(companyId);

    return snapshot.docs.map(doc => {
      const userData = doc.data() as User & { mustChangePassword?: boolean; lastLoginAt?: Date };
      
      return {
        uid: doc.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        companyId: userData.companyId,
        companyName: company.name,
        phone: userData.phone,
        isActive: userData.isActive,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        lastLoginAt: userData.lastLoginAt,
        mustChangePassword: userData.mustChangePassword || false,
      };
    });
  }
}