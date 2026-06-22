import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { join } from 'path';
import { EmbeddedPostgresModule } from './embedded-postgres/embedded-postgres.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesModule } from './roles/roles.module';
import { CategoriasModule } from './categorias/categorias.module';
import { TemporadasModule } from './temporadas/temporadas.module';
import { ClubesModule } from './clubes/clubes.module';
import { EquiposModule } from './equipos/equipos.module';
import { InscripcionesModule } from './inscripciones/inscripciones.module';
import { PagosModule } from './pagos/pagos.module';
import { TorneosModule } from './torneos/torneos.module';
import { JugadoresModule } from './jugadores/jugadores.module';
import { UploadsModule } from './uploads/uploads.module';
import { ResultadosModule } from './resultados/resultados.module';
import { PublicoModule } from './publico/publico.module';
import { ReportesModule } from './reportes/reportes.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module';
import { ArbitrosModule } from './arbitros/arbitros.module';
import { SedesModule } from './sedes/sedes.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    // Rate-limiting global por IP. Configurable por env; default 100 req / 60s.
    // Se resuelve con factory (no constante) para leer el .env ya cargado.
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          ttl: Number(process.env.THROTTLE_TTL_MS) || 60_000,
          limit: Number(process.env.THROTTLE_LIMIT) || 100,
        },
      ],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { index: false, fallthrough: true },
    }),
    EmbeddedPostgresModule,
    PrismaModule,
    AuthModule,
    UsuariosModule,
    RolesModule,
    CategoriasModule,
    TemporadasModule,
    ClubesModule,
    EquiposModule,
    InscripcionesModule,
    PagosModule,
    TorneosModule,
    JugadoresModule,
    UploadsModule,
    ResultadosModule,
    PublicoModule,
    ReportesModule,
    AuditoriaModule,
    ConfiguracionModule,
    EstadisticasModule,
    ArbitrosModule,
    SedesModule,
  ],
  controllers: [HealthController],
  providers: [
    // Aplica el rate-limiting a toda la app
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
