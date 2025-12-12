import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FirestoreService } from 'src/firestore/firestore.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import type { User } from 'src/common/interfaces/user.interface';
import { UserRole } from 'src/common/interfaces/user.interface';

@Injectable()
export class UsersService {
  private readonly collection = 'users';

  constructor(private readonly firestoreService: FirestoreService) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const now = new Date().toISOString();
    
    const userData: Omit<User, 'id'> = {
      email: createUserDto.email,
      passwordHash: createUserDto.passwordHash!,
      name: createUserDto.name,
      role: createUserDto.role,
      companyId: createUserDto.companyId,
      isActive: createUserDto.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.firestoreService.create(this.collection, userData);
    
    const { passwordHash, ...userResponse } = { id: docRef.id, ...userData };
    return userResponse as UserResponseDto;
  }

  async findAll(companyId?: string): Promise<UserResponseDto[]> {
    let users: User[];
    
    if (companyId) {
      users = await this.firestoreService.findByField(this.collection, 'companyId', companyId);
    } else {
      users = await this.firestoreService.findAll(this.collection);
    }

    return users.map(user => {
      const { passwordHash, ...userResponse } = user;
      return userResponse as UserResponseDto;
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.firestoreService.findById(this.collection, id);
  }

  // Método compatible con TasksService - NUEVO
  async findOne(uid: string, requestUser: User): Promise<UserResponseDto> {
    const user = await this.findById(uid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar permisos según el rol del requestUser
    if (requestUser.role === UserRole.ADMIN && user.companyId !== requestUser.companyId) {
      throw new ForbiddenException('No podés ver usuarios de otras empresas');
    }

    if (requestUser.role === UserRole.CLEANER && user.id !== requestUser.id) {
      throw new ForbiddenException('Solo podés ver tu propio perfil');
    }

    const { passwordHash, ...userResponse } = user;
    return userResponse as UserResponseDto;
  }

  async findByEmail(email: string): Promise<User | null> {
    const users = await this.firestoreService.findByField<User>(this.collection, 'email', email);
    return users.length > 0 ? users[0] : null;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const now = new Date().toISOString();
    const updateData = {
      ...updateUserDto,
      updatedAt: now,
    };

    await this.firestoreService.update(this.collection, id, updateData);
    
    const updatedUser = await this.findById(id);
    
    if (!updatedUser) {
      throw new NotFoundException('Error al obtener usuario actualizado');
    }
    
    const { passwordHash, ...userResponse } = updatedUser;
    return userResponse as UserResponseDto;
  }

  async remove(id: string): Promise<void> {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.firestoreService.delete(this.collection, id);
  }

  async findByRole(role: string, companyId?: string): Promise<UserResponseDto[]> {
    let users: User[];
    
    if (companyId) {
      // Buscar por rol y companyId
      users = await this.firestoreService.findByMultipleFields(this.collection, {
        role,
        companyId,
      });
    } else {
      // Solo por rol
      users = await this.firestoreService.findByField(this.collection, 'role', role);
    }

    return users.map(user => {
      const { passwordHash, ...userResponse } = user;
      return userResponse as UserResponseDto;
    });
  }

  // Métodos adicionales que TasksService puede necesitar

  async getMaidsByCompany(companyId: string, requestUser: User): Promise<UserResponseDto[]> {
    // Verificar permisos - solo admins y super admins
    if (requestUser.role === UserRole.CLEANER) {
      throw new ForbiddenException('No tenés permisos para listar mucamas');
    }

    if (requestUser.role === UserRole.ADMIN && requestUser.companyId !== companyId) {
      throw new ForbiddenException('No podés ver mucamas de otras empresas');
    }

    return this.findByRole(UserRole.CLEANER, companyId);
  }

  async getUsersByCompany(companyId: string, requestUser: User): Promise<UserResponseDto[]> {
    // Verificar permisos
    if (requestUser.role === UserRole.ADMIN && requestUser.companyId !== companyId) {
      throw new ForbiddenException('No podés ver usuarios de otras empresas');
    }

    if (requestUser.role === UserRole.CLEANER) {
      throw new ForbiddenException('No tenés permisos para listar usuarios');
    }

    return this.findAll(companyId);
  }

  async changePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.update(userId, { passwordHash: newPasswordHash });
  }

  async updateLastLogin(userId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.update(userId, { 
      lastLoginAt: now,
      updatedAt: now 
    });
  }
}