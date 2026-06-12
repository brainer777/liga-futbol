import { Module } from '@nestjs/common';
import { TorneosService } from './torneos.service';
import { TorneosController } from './torneos.controller';
import { PartidosController } from './partidos.controller';

@Module({
  controllers: [TorneosController, PartidosController],
  providers: [TorneosService],
  exports: [TorneosService],
})
export class TorneosModule {}
