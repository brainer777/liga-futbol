import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TorneosService } from './torneos.service';
import { UpdatePartidoDto, ReprogramarPartidoDto } from './dto/fixture.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('partidos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('partidos')
export class PartidosController {
  constructor(private readonly service: TorneosService) {}

  @Get(':id')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador', 'Delegado de equipo', 'Árbitro', 'Público')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOnePartido(id);
  }

  @Patch(':id')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePartidoDto,
  ) {
    return this.service.updatePartido(id, dto);
  }

  @Post(':id/reprogramar')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador')
  reprogramar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReprogramarPartidoDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.reprogramarPartido(id, dto, userId);
  }

  @Delete(':id')
  @Roles('Superadministrador', 'Administrador de liga')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.eliminarPartido(id);
  }
}
