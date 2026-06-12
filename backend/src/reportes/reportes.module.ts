import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { ResultadosModule } from '../resultados/resultados.module';

@Module({
  imports: [ResultadosModule], // reusa ResultadosService (tabla/goleadores/tarjetas)
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
