import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
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
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
