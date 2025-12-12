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
import { AuthGuard } from '@nestjs/passport';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { QueryCompanyDto } from './dto/query-company.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import { UserRole } from '../../common/interfaces/user.interface';

@ApiTags('companies')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crear nueva empresa' })
  @ApiResponse({
    status: 201,
    description: 'Empresa creada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o empresa ya existe',
  })
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener lista de empresas' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'plan', required: false, enum: ['basic', 'professional', 'enterprise'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Query() queryDto: QueryCompanyDto) {
    return this.companiesService.findAll(queryDto);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener empresa por ID' })
  @ApiResponse({
    status: 200,
    description: 'Empresa encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa no encontrada',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    // Los admins solo pueden ver su propia empresa
    if (user.role === UserRole.ADMIN && user.companyId !== id) {
      throw new Error('No tienes permisos para ver esta empresa');
    }
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar empresa' })
  @ApiResponse({
    status: 200,
    description: 'Empresa actualizada exitosamente',
  })
  update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @CurrentUser() user: User,
  ) {
    // Los admins solo pueden actualizar su propia empresa
    if (user.role === UserRole.ADMIN && user.companyId !== id) {
      throw new Error('No tienes permisos para modificar esta empresa');
    }
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar empresa (soft delete)' })
  @ApiResponse({
    status: 204,
    description: 'Empresa eliminada exitosamente',
  })
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }

  @Get(':id/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas de la empresa' })
  getStats(@Param('id') id: string, @CurrentUser() user: User) {
    // Los admins solo pueden ver estadísticas de su propia empresa
    if (user.role === UserRole.ADMIN && user.companyId !== id) {
      throw new Error('No tienes permisos para ver las estadísticas de esta empresa');
    }
    return this.companiesService.getCompanyStats(id);
  }
}