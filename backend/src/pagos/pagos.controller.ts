import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/pagos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('pagos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pagos')
export class PagosController {
  constructor(private readonly service: PagosService) {}

  @Get()
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador')
  findAll() { return this.service.findAll(); }

  @Get('inscripcion/:inscripcionId')
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador', 'Delegado de equipo')
  findByInscripcion(@Param('inscripcionId', new ParseUUIDPipe()) inscripcionId: string) {
    return this.service.findByInscripcion(inscripcionId);
  }

  @Post()
  @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador')
  create(@Body() dto: CreatePagoDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Delete(':id')
  @Roles('Superadministrador', 'Administrador de liga')
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.remove(id); }
}
