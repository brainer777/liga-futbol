import { Module } from '@nestjs/common';
import { PublicoController } from './publico.controller';
import { PublicoService } from './publico.service';
import { ResultadosModule } from '../resultados/resultados.module';

@Module({
  imports: [ResultadosModule], // reusa ResultadosService (tabla/goleadores/tarjetas)
  controllers: [PublicoController],
  providers: [PublicoService],
})
export class PublicoModule {}
