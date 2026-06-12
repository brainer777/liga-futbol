import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TemporadasService } from './temporadas.service';
import { CreateTemporadaDto, UpdateTemporadaDto } from './dto/temporadas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('temporadas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('temporadas')
export class TemporadasController {
  constructor(private readonly service: TemporadasService) {}

  @Get() @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador', 'Delegado de equipo')
  findAll() { return this.service.findAll(); }

  @Get(':id') @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.findOne(id); }

  @Post() @Roles('Superadministrador', 'Administrador de liga')
  create(@Body() dto: CreateTemporadaDto) { return this.service.create(dto); }

  @Patch(':id') @Roles('Superadministrador', 'Administrador de liga')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateTemporadaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @Roles('Superadministrador')
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.remove(id); }
}
