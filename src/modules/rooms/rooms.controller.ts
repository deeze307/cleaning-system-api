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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomsDto } from './dto/query-rooms.dto';
import { RoomResponseDto } from './dto/room-response.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import type { User } from '../../common/interfaces/user.interface';
import { UserRole } from '../../common/interfaces/user.interface';

@ApiTags('rooms')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Crear nueva habitación',
    description: 'Crear habitación con configuración de camas personalizable'
  })
  @ApiResponse({
    status: 201,
    description: 'Habitación creada exitosamente',
    type: RoomResponseDto,
  })
  create(@Body() createRoomDto: CreateRoomDto, @CurrentUser() user: User): Promise<RoomResponseDto> {
    return this.roomsService.create(createRoomDto, user);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CLEANER)
  @ApiOperation({ summary: 'Obtener lista de habitaciones' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'buildingId', required: false, type: String })
  @ApiQuery({ name: 'floor', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Query() queryDto: QueryRoomsDto, @CurrentUser() user: User) {
    return this.roomsService.findAll(queryDto, user);
  }

  @Get('by-building/:buildingId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CLEANER)
  @ApiOperation({ summary: 'Obtener habitaciones por edificio' })
  getRoomsByBuilding(@Param('buildingId') buildingId: string, @CurrentUser() user: User) {
    return this.roomsService.getRoomsByBuilding(buildingId, user);
  }

  @Get('select-options/:buildingId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CLEANER)
  @ApiOperation({ 
    summary: 'Obtener habitaciones en formato para selects',
    description: 'Retorna solo id, nombre y resumen de camas para dropdowns'
  })
  getRoomsSelectOptions(@Param('buildingId') buildingId: string, @CurrentUser() user: User) {
    return this.roomsService.getRoomsSelectOptions(buildingId, user);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CLEANER)
  @ApiOperation({ summary: 'Obtener habitación por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: User): Promise<RoomResponseDto> {
    return this.roomsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CLEANER)
  @ApiOperation({ 
    summary: 'Actualizar habitación',
    description: 'Admins pueden actualizar todo, mucamas solo cleaningNotes'
  })
  update(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
    @CurrentUser() user: User,
  ): Promise<RoomResponseDto> {
    return this.roomsService.update(id, updateRoomDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar habitación (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: User): Promise<void> {
    return this.roomsService.remove(id, user);
  }
}