import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ArbitrosService } from './arbitros.service';
import { CreateArbitroDto, UpdateArbitroDto } from './dto/arbitros.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('arbitros')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('arbitros')
export class ArbitrosController {
  constructor(private readonly service: ArbitrosService) {}

  // Lectura amplia: la usan también Coordinador/Digitador para asignar árbitro al partido.
  @Get() @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador')
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.service.findAll(includeInactive === 'true');
  }

  @Get(':id') @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.findOne(id); }

  // Gestión: solo administración.
  @Post() @Roles('Superadministrador', 'Administrador de liga')
  create(@Body() dto: CreateArbitroDto) { return this.service.create(dto); }

  @Patch(':id') @Roles('Superadministrador', 'Administrador de liga')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateArbitroDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @Roles('Superadministrador', 'Administrador de liga')
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.remove(id); }
}
