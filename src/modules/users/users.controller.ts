import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UserRole } from '../../common/interfaces/user.interface';
import  type { User } from '../../common/interfaces/user.interface';
import * as bcrypt from 'bcrypt';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Crear nuevo usuario',
    description: 'Super admins pueden crear en cualquier empresa, admins solo en la suya'
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
    type: UserResponseDto,
  })
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: User): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener lista de usuarios' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Query() queryDto: QueryUsersDto, @CurrentUser() user: User) {
    const companyId = queryDto.companyId || (user.role !== 'super_admin' ? user.companyId : undefined);
    return this.usersService.findAll(companyId);
  }

  @Get('by-company/:companyId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener usuarios por empresa' })
  getUsersByCompany(@Param('companyId') companyId: string, @CurrentUser() user: User) {
    return this.usersService.getUsersByCompany(companyId, user);
  }

  @Get('maids/:companyId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener mucamas por empresa' })
  getMaidsByCompany(@Param('companyId') companyId: string, @CurrentUser() user: User) {
    return this.usersService.getMaidsByCompany(companyId, user);
  }

  @Get(':uid')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CLEANER)
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@Param('uid') uid: string, @CurrentUser() user: User): Promise<UserResponseDto> {
    return this.usersService.findOne(uid, user);
  }

  @Patch(':uid')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CLEANER)
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(
    @Param('uid') uid: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: User,
  ): Promise<UserResponseDto> {
    return this.usersService.update(uid, updateUserDto);
  }

  @Delete(':uid')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar usuario (soft delete)' })
  remove(@Param('uid') uid: string, @CurrentUser() user: User): Promise<void> {
    return this.usersService.remove(uid);
  }

  @Patch(':uid/password')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CLEANER)
  @ApiOperation({ summary: 'Cambiar contraseña' })
  async changePassword(
    @Param('uid') uid: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() user: User,
  ) {
    // Hashear la nueva contraseña antes de guardar
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    return this.usersService.changePassword(uid, hashedPassword);
  }

  @Patch(':uid/last-login')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CLEANER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Actualizar último login' })
  updateLastLogin(@Param('uid') uid: string, @CurrentUser() user: User) {
    // Solo el propio usuario puede actualizar su último login
    if (uid !== user.id) {
      throw new Error('Solo podés actualizar tu propio último login');
    }
    return this.usersService.updateLastLogin(uid);
  }
}