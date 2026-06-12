import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EquiposService } from './equipos.service';
import { CreateEquipoDto, UpdateEquipoDto } from './dto/equipos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('equipos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipos')
export class EquiposController {
  constructor(private readonly service: EquiposService) {}

  @Get()
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador', 'Delegado de equipo')
  findAll(@Query('clubId') clubId?: string, @Query('categoriaId') categoriaId?: string) {
    return this.service.findAll({ clubId, categoriaId });
  }

  @Get(':id') @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador', 'Delegado de equipo')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.findOne(id); }

  @Post() @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Delegado de equipo')
  create(@Body() dto: CreateEquipoDto) { return this.service.create(dto); }

  @Patch(':id') @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Delegado de equipo')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateEquipoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @Roles('Superadministrador', 'Administrador de liga')
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.remove(id); }
}
