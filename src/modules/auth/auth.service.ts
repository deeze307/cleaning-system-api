import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from 'src/common/interfaces/user.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      companyId: user.companyId 
    };
    
    const access_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: '24h',
      algorithm: 'HS256'
    });

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      access_token,
      user: userWithoutPassword,
    };
  }

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { email, password, name, role, companyId } = registerDto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('El usuario ya existe');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await this.usersService.create({
      email,
      passwordHash,
      name,
      role,
      companyId,
      isActive: true,
    });

    return { message: 'Usuario creado exitosamente' };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);
      
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Token inválido o usuario inactivo');
      }

      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }

  async resetPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'Si el email existe, se enviará un link de recuperación' };
    }

    // TODO: Implementar envío de email de recuperación
    // Por ahora solo devolver mensaje
    return { message: 'Si el email existe, se enviará un link de recuperación' };
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    await this.usersService.update(userId, { isActive });
    
    const status = isActive ? 'activado' : 'desactivado';
    return { message: `Usuario ${status} exitosamente` };
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    await this.usersService.remove(userId);
    return { message: 'Usuario eliminado exitosamente' };
  }

  async getAuthStats(): Promise<any> {
    // Obtener estadísticas básicas de autenticación
    const allUsers = await this.usersService.findAll();
    
    const stats = {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(user => user.isActive).length,
      inactiveUsers: allUsers.filter(user => !user.isActive).length,
      usersByRole: {
        super_admin: allUsers.filter(user => user.role === UserRole.SUPER_ADMIN).length,
        admin: allUsers.filter(user => user.role === UserRole.ADMIN).length,
        cleaner: allUsers.filter(user => user.role === UserRole.CLEANER).length,
      }
    };

    return stats;
  }
}