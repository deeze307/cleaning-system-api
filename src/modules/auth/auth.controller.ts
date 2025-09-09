import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import { UserRole } from '../../common/interfaces/user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ 
    summary: 'Registrar nuevo usuario',
    description: 'Crea un nuevo usuario y opcionalmente una empresa (para admins)'
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o email ya existe',
  })
  register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ 
    summary: 'Login de usuario',
    description: 'Use Firebase Auth SDK en el frontend. Este endpoint es informativo.'
  })
  @ApiResponse({
    status: 400,
    description: 'Use Firebase Auth SDK en el frontend',
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ 
    summary: 'Obtener perfil del usuario actual',
    description: 'Retorna información completa del usuario autenticado'
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario',
    type: AuthResponseDto,
  })
  getProfile(@CurrentUser() user: User): Promise<AuthResponseDto> {
    return this.authService.getUserProfile(user.uid);
  }

  @Get('profile/:uid')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ 
    summary: 'Obtener perfil de usuario por ID',
    description: 'Solo super admins pueden ver cualquier usuario, admins solo usuarios de su empresa'
  })
  getUserById(@Param('uid') uid: string, @CurrentUser() user: User): Promise<AuthResponseDto> {
    return this.authService.getUserProfile(uid);
  }

  @Post('verify-token')
  @ApiOperation({ 
    summary: 'Verificar token de Firebase',
    description: 'Valida un token de Firebase Auth y retorna información del usuario'
  })
  @ApiResponse({
    status: 200,
    description: 'Token válido',
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido o expirado',
  })
  verifyToken(@Body() verifyTokenDto: VerifyTokenDto) {
    return this.authService.verifyToken(verifyTokenDto.token);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Solicitar reset de contraseña',
    description: 'Envía email para resetear contraseña'
  })
  @ApiResponse({
    status: 200,
    description: 'Email de reset enviado',
  })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Patch('users/:uid/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ 
    summary: 'Activar/desactivar usuario',
    description: 'Cambiar estado activo de un usuario'
  })
  updateUserStatus(
    @Param('uid') uid: string,
    @Body() body: { isActive: boolean },
    @CurrentUser() currentUser: User,
  ) {
    return this.authService.updateUserStatus(uid, body.isActive);
  }

  @Delete('users/:uid')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Eliminar usuario (soft delete)',
    description: 'Solo super admins pueden eliminar usuarios'
  })
  deleteUser(@Param('uid') uid: string) {
    return this.authService.deleteUser(uid);
  }

  @Get('stats')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ 
    summary: 'Estadísticas de autenticación',
    description: 'Solo para super admins'
  })
  getAuthStats() {
    return this.authService.getAuthStats();
  }
}