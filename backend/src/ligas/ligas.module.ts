import { Module } from '@nestjs/common';
import { LigasService } from './ligas.service';
import { LigasController } from './ligas.controller';

@Module({ controllers: [LigasController], providers: [LigasService], exports: [LigasService] })
export class LigasModule {}
