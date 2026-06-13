import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EstadisticasService } from './estadisticas.service';
import { EstadisticasQueryDto } from './dto/estadisticas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const LECTURA = [
  'Superadministrador',
  'Administrador de liga',
  'Coordinador',
  'Digitador',
  'Árbitro',
  'Delegado de equipo',
];

/** Estadísticas globales para el dashboard (autenticado). */
@ApiTags('estadisticas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('estadisticas')
export class EstadisticasController {
  constructor(private readonly service: EstadisticasService) {}

  @Get('resumen')
  @Roles(...LECTURA)
  resumen(@Query() q: EstadisticasQueryDto) {
    return this.service.resumen(q);
  }

  @Get('goleadores')
  @Roles(...LECTURA)
  goleadores(@Query() q: EstadisticasQueryDto) {
    return this.service.goleadores(q);
  }

  @Get('tarjetas')
  @Roles(...LECTURA)
  tarjetas(@Query() q: EstadisticasQueryDto) {
    return this.service.tarjetas(q);
  }

  @Get('equipos')
  @Roles(...LECTURA)
  equipos(@Query() q: EstadisticasQueryDto) {
    return this.service.equipos(q);
  }
}
