import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InscripcionesService } from './inscripciones.service';
import { CreateInscripcionDto, UpdateInscripcionDto } from './dto/inscripciones.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('inscripciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inscripciones')
export class InscripcionesController {
  constructor(private readonly service: InscripcionesService) {}

  @Get()
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador', 'Delegado de equipo')
  findAll(@Query('torneoId') torneoId?: string, @Query('equipoId') equipoId?: string, @Query('estado') estado?: string) {
    return this.service.findAll({ torneoId, equipoId, estado });
  }

  @Get(':id')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador', 'Delegado de equipo')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Delegado de equipo')
  create(@Body() dto: CreateInscripcionDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(':id')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateInscripcionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('Superadministrador', 'Administrador de liga')
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.remove(id); }
}
