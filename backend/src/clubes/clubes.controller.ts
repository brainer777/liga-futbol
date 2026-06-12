import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClubesService } from './clubes.service';
import { CreateClubDto, UpdateClubDto } from './dto/clubes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('clubes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clubes')
export class ClubesController {
  constructor(private readonly service: ClubesService) {}

  @Get() @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador', 'Delegado de equipo')
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.service.findAll(includeInactive === 'true');
  }

  @Get(':id') @Roles('Superadministrador', 'Administrador de liga', 'Coordinador', 'Digitador')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.findOne(id); }

  @Post() @Roles('Superadministrador', 'Administrador de liga', 'Coordinador')
  create(@Body() dto: CreateClubDto) { return this.service.create(dto); }

  @Patch(':id') @Roles('Superadministrador', 'Administrador de liga', 'Coordinador')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateClubDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @Roles('Superadministrador')
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.remove(id); }
}
