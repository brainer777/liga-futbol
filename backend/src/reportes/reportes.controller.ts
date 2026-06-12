import { Controller, Get, Header, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const ROLES_REPORTE = [
  'Superadministrador',
  'Administrador de liga',
  'Coordinador',
  'Digitador',
  'Delegado de equipo',
] as const;

/**
 * Reportes descargables en CSV (autenticados). Devuelven texto CSV con los
 * headers Content-Type/Content-Disposition para que el navegador lo baje.
 */
@ApiTags('reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Get('torneos/:id/tabla.csv')
  @Roles(...ROLES_REPORTE)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="tabla.csv"')
  tabla(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.tablaCsv(id);
  }

  @Get('torneos/:id/goleadores.csv')
  @Roles(...ROLES_REPORTE)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="goleadores.csv"')
  goleadores(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.goleadoresCsv(id);
  }

  @Get('torneos/:id/tarjetas.csv')
  @Roles(...ROLES_REPORTE)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="tarjetas.csv"')
  tarjetas(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.tarjetasCsv(id);
  }

  @Get('torneos/:id/fixture.csv')
  @Roles(...ROLES_REPORTE)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="fixture.csv"')
  fixture(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.fixtureCsv(id);
  }
}
