import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TorneosService } from './torneos.service';
import { CreateTorneoDto, UpdateTorneoDto } from './dto/torneos.dto';
import { GenerarFixtureDto, UpdatePartidoDto, ReprogramarPartidoDto, GenerarEliminatoriasDto, AvanzarEliminatoriaDto } from './dto/fixture.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('torneos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('torneos')
export class TorneosController {
  constructor(private readonly service: TorneosService) {}

  // -------- Torneo CRUD (existente) --------
  @Get() @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador', 'Delegado de equipo')
  findAll() { return this.service.findAll(); }

  @Get(':id') @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador', 'Delegado de equipo')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.findOne(id); }

  @Post() @Roles('Superadministrador', 'Administrador de liga')
  create(@Body() dto: CreateTorneoDto) { return this.service.create(dto); }

  @Patch(':id') @Roles('Superadministrador', 'Administrador de liga')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateTorneoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @Roles('Superadministrador')
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.remove(id); }

  // -------- Fixture / Fases / Grupos / Partidos (Sprint 3) --------
  @Post(':id/generar-fixture')
  @Roles('Superadministrador', 'Administrador de liga')
  generarFixture(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: GenerarFixtureDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.generarFixture(id, dto, userId);
  }

  @Post(':id/generar-eliminatorias')
  @Roles('Superadministrador', 'Administrador de liga')
  generarEliminatorias(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: GenerarEliminatoriasDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.generarEliminatorias(id, dto, userId);
  }

  @Post(':id/avanzar-eliminatoria')
  @Roles('Superadministrador', 'Administrador de liga')
  avanzarEliminatoria(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AvanzarEliminatoriaDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.avanzarEliminatoria(id, dto, userId);
  }

  @Get(':id/fases')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador', 'Delegado de equipo')
  listarFases(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.listarFases(id); }

  @Get(':id/partidos')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador', 'Delegado de equipo', 'Árbitro')
  listarPartidos(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.listarPartidos(id); }
}
