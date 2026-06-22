import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SedesService } from './sedes.service';
import { CreateSedeDto, UpdateSedeDto } from './dto/sedes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('sedes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sedes')
export class SedesController {
  constructor(private readonly service: SedesService) {}

  // Lectura amplia: la usan también Coordinador/Digitador para asignar sede al partido.
  @Get() @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador')
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.service.findAll(includeInactive === 'true');
  }

  @Get(':id') @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.findOne(id); }

  // Gestión: solo administración.
  @Post() @Roles('Superadministrador', 'Administrador de liga')
  create(@Body() dto: CreateSedeDto) { return this.service.create(dto); }

  @Patch(':id') @Roles('Superadministrador', 'Administrador de liga')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateSedeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @Roles('Superadministrador', 'Administrador de liga')
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.remove(id); }
}
