import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LigasService } from './ligas.service';
import { CreateLigaDto, UpdateLigaDto } from './dto/ligas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperadminGuard } from '../auth/guards/superadmin.guard';

/**
 * Gestión de ligas de la plataforma. Solo Superadministrador de plataforma
 * (SuperadminGuard, sin contexto de tenant). No hay borrado: desactivar una
 * liga la saca de circulación sin cascadear sus datos.
 */
@ApiTags('ligas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperadminGuard)
@Controller('ligas')
export class LigasController {
  constructor(private readonly service: LigasService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateLigaDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateLigaDto) {
    return this.service.update(id, dto);
  }
}
