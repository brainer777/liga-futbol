import { Module } from '@nestjs/common';
import { ClubesService } from './clubes.service';
import { ClubesController } from './clubes.controller';

@Module({ controllers: [ClubesController], providers: [ClubesService], exports: [ClubesService] })
export class ClubesModule {}
