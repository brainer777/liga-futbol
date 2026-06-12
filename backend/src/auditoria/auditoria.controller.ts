import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('auditoria')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly service: AuditoriaService) {}

  @Get()
  @Roles('Superadministrador', 'Administrador de liga')
  listar(
    @Query('entidad') entidad?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listar({
      entidad,
      usuarioId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
