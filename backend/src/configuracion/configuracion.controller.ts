import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ConfiguracionService } from './configuracion.service';
import { UpdateConfiguracionDto } from './dto/configuracion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const fileBody = {
  schema: {
    type: 'object',
    properties: { file: { type: 'string', format: 'binary' } },
    required: ['file'],
  },
};

/**
 * Configuración / branding. La ESCRITURA es solo para Superadministrador.
 * La LECTURA pública (login y portal sin auth) vive en PublicoController
 * (GET /publico/configuracion), no acá, porque este controller tiene guards.
 */
@ApiTags('configuracion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly service: ConfiguracionService) {}

  @Get()
  @Roles('Superadministrador')
  get() {
    return this.service.get();
  }

  @Patch()
  @Roles('Superadministrador')
  update(@Body() dto: UpdateConfiguracionDto) {
    return this.service.update(dto);
  }

  @Post('logo')
  @Roles('Superadministrador')
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  setLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return this.service.setLogo(file);
  }

  @Post('favicon')
  @Roles('Superadministrador')
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  setFavicon(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return this.service.setFavicon(file);
  }
}
