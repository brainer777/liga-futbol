import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicoService } from './publico.service';

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
