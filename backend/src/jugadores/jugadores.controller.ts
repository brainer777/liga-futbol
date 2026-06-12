import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JugadoresService } from './jugadores.service';
import { CreateJugadorDto, UpdateJugadorDto } from './dto/jugadores.dto';
import { CreateDocumentoDto, UpdateDocumentoDto } from './dto/documentos.dto';
import { CreateEquipoJugadorDto, UpdateEquipoJugadorDto } from './dto/equipo-jugadores.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('jugadores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jugadores')
export class JugadoresController {
  constructor(private readonly service: JugadoresService) {}

  // ---- Jugadores ----
  @Get()
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Delegado de equipo', 'Digitador', 'Árbitro')
  findAll(@Query('estado') estado?: string, @Query('search') search?: string, @Query('equipoId') equipoId?: string) {
    return this.service.findAll({ estado, search, equipoId });
  }

  @Get(':id')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Delegado de equipo', 'Digitador', 'Árbitro')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Delegado de equipo', 'Digitador')
  create(@Body() dto: CreateJugadorDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(':id')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Delegado de equipo')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateJugadorDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('Superadministrador', 'Administrador de liga')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }

  @Post(':id/revalidar/:categoriaId')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador')
  revalidar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('categoriaId', new ParseUUIDPipe()) categoriaId: string,
  ) {
    return this.service.revalidar(id, categoriaId);
  }

  // ---- Documentos ----
  @Get(':id/documentos')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Delegado de equipo', 'Digitador')
  listarDocumentos(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.listarDocumentos(id);
  }

  @Post('documentos')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Delegado de equipo', 'Digitador')
  crearDocumento(@Body() dto: CreateDocumentoDto) {
    return this.service.crearDocumento(dto);
  }

  @Patch('documentos/:id')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador')
  actualizarDocumento(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDocumentoDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.actualizarDocumento(id, dto, userId);
  }

  @Delete('documentos/:id')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador')
  eliminarDocumento(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.eliminarDocumento(id);
  }

  // ---- Equipo-Jugadores (plantilla) ----
  @Get('equipo/:equipoId/plantilla')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Delegado de equipo', 'Digitador')
  listarPlantilla(@Param('equipoId', new ParseUUIDPipe()) equipoId: string) {
    return this.service.listarPlantilla(equipoId);
  }

  @Post('equipo-jugador')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Delegado de equipo')
  agregarAEquipo(@Body() dto: CreateEquipoJugadorDto) {
    return this.service.agregarAEquipo(dto);
  }

  @Patch('equipo-jugador/:id')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador')
  actualizarEquipoJugador(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateEquipoJugadorDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.actualizarEquipoJugador(id, dto, userId);
  }

  @Delete('equipo-jugador/:id')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Delegado de equipo')
  quitarDeEquipo(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.quitarDeEquipo(id);
  }
}
