import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResultadosService } from './resultados.service';
import { RegistrarResultadoDto, UpdateResultadoDto, CerrarResultadoDto } from './dto/resultados.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('resultados')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('resultados')
export class ResultadosController {
  constructor(private readonly service: ResultadosService) {}

  @Post()
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Árbitro', 'Digitador')
  registrar(@Body() dto: RegistrarResultadoDto, @CurrentUser('id') userId: string) {
    return this.service.registrar(dto, userId);
  }

  @Get(':id')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Árbitro', 'Digitador', 'Delegado de equipo')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Get('partido/:partidoId')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Árbitro', 'Digitador', 'Delegado de equipo', 'Público')
  findByPartido(@Param('partidoId', new ParseUUIDPipe()) partidoId: string) {
    return this.service.findByPartido(partidoId);
  }

  @Patch(':id')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Árbitro')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateResultadoDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/cerrar')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Árbitro')
  cerrar(@Param('id', new ParseUUIDPipe()) id: string, @Body() _dto: CerrarResultadoDto, @CurrentUser('id') userId: string) {
    return this.service.cerrar(id, userId);
  }

  @Delete(':id')
  @Roles('Superadministrador', 'Administrador de liga')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.delete(id);
  }

  // -------- Tabla y rankings (público para el torneo) --------

  @Get('torneo/:torneoId/tabla')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Árbitro', 'Digitador', 'Delegado de equipo', 'Público')
  tabla(@Param('torneoId', new ParseUUIDPipe()) torneoId: string) {
    return this.service.tablaPosiciones(torneoId);
  }

  @Get('torneo/:torneoId/goleadores')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Árbitro', 'Digitador', 'Delegado de equipo', 'Público')
  goleadores(@Param('torneoId', new ParseUUIDPipe()) torneoId: string) {
    return this.service.goleadores(torneoId);
  }

  @Get('torneo/:torneoId/tarjetas')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Árbitro', 'Digitador', 'Delegado de equipo', 'Público')
  tarjetas(@Param('torneoId', new ParseUUIDPipe()) torneoId: string) {
    return this.service.tarjetas(torneoId);
  }

  @Get('torneo/:torneoId/sanciones')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Árbitro', 'Digitador')
  sanciones(@Param('torneoId', new ParseUUIDPipe()) torneoId: string) {
    return this.service.sanciones(torneoId);
  }

  @Patch('sanciones/:id')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador')
  updateSancion(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { estado?: string; fechasCumplidas?: number },
  ) {
    return this.service.updateSancion(id, body);
  }
}
