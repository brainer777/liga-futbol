import { Module } from '@nestjs/common';
import { InscripcionesService } from './inscripciones.service';
import { InscripcionesController } from './inscripciones.controller';

@Module({ controllers: [InscripcionesController], providers: [InscripcionesService], exports: [InscripcionesService] })
export class InscripcionesModule {}
