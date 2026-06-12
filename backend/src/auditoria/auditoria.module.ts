import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaInterceptor } from './auditoria.interceptor';

@Module({
  controllers: [AuditoriaController],
  providers: [
    AuditoriaService,
    // Interceptor global: registra todas las mutaciones de la app
    { provide: APP_INTERCEPTOR, useClass: AuditoriaInterceptor },
  ],
})
export class AuditoriaModule {}
