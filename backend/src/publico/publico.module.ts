import { Module } from '@nestjs/common';
import { PublicoController } from './publico.controller';
import { PublicoService } from './publico.service';
import { ResultadosModule } from '../resultados/resultados.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { EstadisticasModule } from '../estadisticas/estadisticas.module';

@Module({
  imports: [ResultadosModule, ConfiguracionModule, EstadisticasModule], // reusa Resultados + Configuracion + Estadisticas
  controllers: [PublicoController],
  providers: [PublicoService],
})
export class PublicoModule {}
