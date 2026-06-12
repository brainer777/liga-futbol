import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRolDto, UpdateRolDto } from './dto/roles.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles('Superadministrador', 'Administrador de liga')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Roles('Superadministrador', 'Administrador de liga')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @Roles('Superadministrador')
  create(@Body() dto: CreateRolDto) {
    return this.rolesService.create(dto);
  }

  @Patch(':id')
  @Roles('Superadministrador')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateRolDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Superadministrador')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.rolesService.remove(id);
  }
}
