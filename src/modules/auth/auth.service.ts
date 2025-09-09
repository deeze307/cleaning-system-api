import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { FirebaseConfigService } from '../../config/firebase.config';
import { CompaniesService } from '../companies/companies.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserRole, User, CompanyPlan } from '../../common/interfaces/user.interface';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  private readonly usersCollection = 'users';

  constructor(
    private firebaseConfig: FirebaseConfigService,
    private companiesService: CompaniesService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, name, role, companyName, companyDescription, companyPlan, companyId } = registerDto;
    let userRecord: admin.auth.UserRecord | undefined;
    try {
      // Crear usuario en Firebase Auth
      userRecord = await this.firebaseConfig.auth.createUser({
        email,
        password,
        displayName: name,
      });

      let finalCompanyId: string;
      let companyNameForResponse = '';

      if (role === UserRole.ADMIN) {
        // Los admins pueden crear una nueva empresa o ser asignados a una existente
        if (companyName && !companyId) {
          // Crear nueva empresa
          const newCompany = await this.companiesService.create({
            name: companyName,
            description: companyDescription,
            plan: companyPlan || CompanyPlan.BASIC,
            maxBuildings: this.getMaxBuildingsByPlan(companyPlan || CompanyPlan.BASIC),
            isActive: true,
          });
          finalCompanyId = newCompany.id;
          companyNameForResponse = newCompany.name;
        } else if (companyId) {
          // Verificar que la empresa existe
          const company = await this.companiesService.findOne(companyId);
          finalCompanyId = companyId;
          companyNameForResponse = company.name;
        } else {
          throw new BadRequestException('Los administradores deben especificar una empresa o crear una nueva');
        }
      } else if (role === UserRole.MAID) {
        // Las mucamas deben ser asignadas a una empresa existente
        if (!companyId) {
          throw new BadRequestException('Las mucamas deben ser asignadas a una empresa existente');
        }
        const company = await this.companiesService.findOne(companyId);
        finalCompanyId = companyId;
        companyNameForResponse = company.name;
      } else if (role === UserRole.SUPER_ADMIN) {
        // Los super admins no pertenecen a ninguna empresa específica
        finalCompanyId = 'system';
        companyNameForResponse = 'Sistema';
      } else {
        throw new BadRequestException('Rol de usuario no válido');
      }

      // Crear documento de usuario en Firestore
      const now = new Date();
      const userData: Omit<User, 'uid'> = {
        email,
        name,
        role,
        companyId: finalCompanyId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      await this.firebaseConfig.firestore
        .collection(this.usersCollection)
        .doc(userRecord.uid)
        .set(userData);

      // Generar custom token para login automático
      const customToken = await this.firebaseConfig.auth.createCustomToken(userRecord.uid);

      return {
        uid: userRecord.uid,
        email,
        name,
        role,
        companyId: finalCompanyId,
        companyName: companyNameForResponse,
        accessToken: customToken,
        isActive: true,
        createdAt: now,
      };

    } catch (error) {
      // Si algo falla, limpiar el usuario de Firebase Auth
      try {
        if (userRecord?.uid) {
          await this.firebaseConfig.auth.deleteUser(userRecord.uid);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up user:', cleanupError);
      }

      if (error.code === 'auth/email-already-exists') {
        throw new BadRequestException('Ya existe un usuario con este correo electrónico');
      }

      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Note: El login real se maneja en el frontend con Firebase Auth
    // Este endpoint es principalmente para obtener los datos del usuario después del login
    throw new BadRequestException(
      'Use Firebase Auth SDK en el frontend para login. Este endpoint es para obtener datos de usuario.'
    );
  }

  async getUserProfile(uid: string): Promise<AuthResponseDto> {
    const firestore = this.firebaseConfig.firestore;
    
    // Obtener datos del usuario
    const userDoc = await firestore.collection(this.usersCollection).doc(uid).get();
    
    if (!userDoc.exists) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const userData = userDoc.data() as User;
    
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

    // Generar nuevo custom token
    const customToken = await this.firebaseConfig.auth.createCustomToken(uid);

    return {
      uid,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      companyId: userData.companyId,
      companyName,
      accessToken: customToken,
      isActive: userData.isActive,
      createdAt: userData.createdAt,
    };
  }

  async verifyToken(token: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const decodedToken = await this.firebaseConfig.auth.verifyIdToken(token);
      
      // Verificar que el usuario existe en Firestore
      const userDoc = await this.firebaseConfig.firestore
        .collection(this.usersCollection)
        .doc(decodedToken.uid)
        .get();

      if (!userDoc.exists) {
        throw new UnauthorizedException('Usuario no encontrado en la base de datos');
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new UnauthorizedException('Datos de usuario no encontrados');
      }
      if (!userData.isActive) {
        throw new UnauthorizedException('Usuario desactivado');
      }

      return decodedToken;
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { email } = resetPasswordDto;
    
    try {
      // Verificar que el usuario existe
      const userRecord = await this.firebaseConfig.auth.getUserByEmail(email);
      
      // Generar link de reset
      const actionCodeSettings = {
        url: `${process.env.FRONTEND_URL}/login?message=password-reset`,
        handleCodeInApp: false,
      };

      await this.firebaseConfig.auth.generatePasswordResetLink(email, actionCodeSettings);
      
      return {
        message: 'Se ha enviado un correo electrónico con instrucciones para resetear tu contraseña'
      };
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Por seguridad, no revelar si el email existe o no
        return {
          message: 'Si el correo electrónico existe, recibirás instrucciones para resetear tu contraseña'
        };
      }
      throw error;
    }
  }

  async updateUserStatus(uid: string, isActive: boolean): Promise<void> {
    const firestore = this.firebaseConfig.firestore;
    
    await firestore.collection(this.usersCollection).doc(uid).update({
      isActive,
      updatedAt: new Date(),
    });

    // También deshabilitar/habilitar en Firebase Auth
    await this.firebaseConfig.auth.updateUser(uid, {
      disabled: !isActive,
    });
  }

  async deleteUser(uid: string): Promise<void> {
    // Soft delete - marcar como inactivo
    await this.updateUserStatus(uid, false);
  }

  private getMaxBuildingsByPlan(plan: CompanyPlan): number {
    switch (plan) {
      case CompanyPlan.BASIC:
        return 5;
      case CompanyPlan.PROFESSIONAL:
        return 25;
      case CompanyPlan.ENTERPRISE:
        return 100;
      default:
        return 5;
    }
  }

  // Método para que super admins puedan obtener estadísticas
  async getAuthStats(): Promise<{
    totalUsers: number;
    totalCompanies: number;
    usersByRole: Record<UserRole, number>;
    activeUsers: number;
    inactiveUsers: number;
  }> {
    const firestore = this.firebaseConfig.firestore;
    
    const [usersSnapshot, companiesSnapshot] = await Promise.all([
      firestore.collection(this.usersCollection).get(),
      firestore.collection('companies').get(),
    ]);

    const users = usersSnapshot.docs.map(doc => doc.data() as User);
    
    const usersByRole = {
      [UserRole.SUPER_ADMIN]: 0,
      [UserRole.ADMIN]: 0,
      [UserRole.MAID]: 0,
    };

    let activeUsers = 0;
    let inactiveUsers = 0;

    users.forEach(user => {
      usersByRole[user.role]++;
      if (user.isActive) {
        activeUsers++;
      } else {
        inactiveUsers++;
      }
    });

    return {
      totalUsers: users.length,
      totalCompanies: companiesSnapshot.size,
      usersByRole,
      activeUsers,
      inactiveUsers,
    };
  }
}