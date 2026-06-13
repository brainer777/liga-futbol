import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicoService } from './publico.service';
import { EstadisticasQueryDto } from '../estadisticas/dto/estadisticas.dto';

/**
 * Endpoints PÚBLICOS (sin guards ni autenticación).
 *
 * A diferencia del resto de controllers, este NO usa JwtAuthGuard: cualquiera
 * puede consultar resultados, tabla y fixture. Todo lo que devuelve está
 * proyectado a campos seguros en PublicoService.
 */
@ApiTags('publico')
@Controller('publico')
export class PublicoController {
  constructor(private readonly service: PublicoService) {}

  @Get('configuracion')
  configuracion() {
    return this.service.configuracionPublica();
  }

  @Get('estadisticas/resumen')
  estadisticasResumen(@Query() q: EstadisticasQueryDto) {
    return this.service.estadisticasResumen(q);
  }

  @Get('estadisticas/goleadores')
  estadisticasGoleadores(@Query() q: EstadisticasQueryDto) {
    return this.service.estadisticasGoleadores(q);
  }

  @Get('estadisticas/tarjetas')
  estadisticasTarjetas(@Query() q: EstadisticasQueryDto) {
    return this.service.estadisticasTarjetas(q);
  }

  @Get('estadisticas/equipos')
  estadisticasEquipos(@Query() q: EstadisticasQueryDto) {
    return this.service.estadisticasEquipos(q);
  }

  @Get('torneos')
  torneos() {
    return this.service.torneos();
  }

  @Get('torneos/:id')
  torneo(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.torneo(id);
  }

  @Get('torneos/:id/fixture')
  fixture(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.fixture(id);
  }

  @Get('torneos/:id/tabla')
  tabla(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.tabla(id);
  }

  @Get('torneos/:id/goleadores')
  goleadores(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.goleadores(id);
  }

  @Get('torneos/:id/tarjetas')
  tarjetas(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.tarjetas(id);
  }
}
