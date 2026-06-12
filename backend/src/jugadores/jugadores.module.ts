import { Module } from '@nestjs/common';
import { JugadoresService } from './jugadores.service';
import { JugadoresController } from './jugadores.controller';

@Module({
  controllers: [JugadoresController],
  providers: [JugadoresService],
  exports: [JugadoresService],
})
export class JugadoresModule {}
