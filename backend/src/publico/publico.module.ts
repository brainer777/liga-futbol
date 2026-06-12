import { Module } from '@nestjs/common';
import { PublicoController } from './publico.controller';
import { PublicoService } from './publico.service';
import { ResultadosModule } from '../resultados/resultados.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';

@Module({
  imports: [ResultadosModule, ConfiguracionModule], // reusa ResultadosService + ConfiguracionService
  controllers: [PublicoController],
  providers: [PublicoService],
})
export class PublicoModule {}
