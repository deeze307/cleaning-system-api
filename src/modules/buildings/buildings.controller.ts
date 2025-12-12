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
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { QueryBuildingsDto } from './dto/query-buildings.dto';
import { BuildingResponseDto } from './dto/building-response.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import { UserRole, BuildingType } from '../../common/interfaces/user.interface';

@ApiTags('buildings')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Crear nuevo edificio',
    description: 'Super admins pueden crear en cualquier empresa, admins solo en la suya'
  })
  @ApiResponse({
    status: 201,
    description: 'Edificio creado exitosamente',
    type: BuildingResponseDto,
  })
  create(@Body() createBuildingDto: CreateBuildingDto, @CurrentUser() user: User): Promise<BuildingResponseDto> {
    return this.buildingsService.create(createBuildingDto, user);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CLEANER)
  @ApiOperation({ summary: 'Obtener lista de edificios' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: BuildingType })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Query() queryDto: QueryBuildingsDto, @CurrentUser() user: User) {
    return this.buildingsService.findAll(queryDto, user);
  }

  @Get('by-company/:companyId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CLEANER)
  @ApiOperation({ summary: 'Obtener edificios por empresa' })
  getBuildingsByCompany(@Param('companyId') companyId: string, @CurrentUser() user: User) {
    return this.buildingsService.getBuildingsByCompany(companyId, user);
  }

  @Get('select-options')
  @Roles(UserRole.ADMIN, UserRole.CLEANER)
  @ApiOperation({ 
    summary: 'Obtener edificios en formato para selects',
    description: 'Retorna solo id, nombre y tipo para dropdowns'
  })
  getBuildingsSelectOptions(@CurrentUser() user: User) {
    return this.buildingsService.getBuildingsSelectOptions(user);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CLEANER)
  @ApiOperation({ summary: 'Obtener edificio por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: User): Promise<BuildingResponseDto> {
    return this.buildingsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar edificio' })
  update(
    @Param('id') id: string,
    @Body() updateBuildingDto: UpdateBuildingDto,
    @CurrentUser() user: User,
  ): Promise<BuildingResponseDto> {
    return this.buildingsService.update(id, updateBuildingDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar edificio (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: User): Promise<void> {
    return this.buildingsService.remove(id, user);
  }
}