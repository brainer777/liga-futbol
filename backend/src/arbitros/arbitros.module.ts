import { Module } from '@nestjs/common';
import { ArbitrosService } from './arbitros.service';
import { ArbitrosController } from './arbitros.controller';

@Module({ controllers: [ArbitrosController], providers: [ArbitrosService], exports: [ArbitrosService] })
export class ArbitrosModule {}
