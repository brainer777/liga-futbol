/**
 * Servicio que levanta una instancia embebida de PostgreSQL al arrancar
 * cuando USE_EMBEDDED_POSTGRES=true. Útil para que el dev pueda correr
 * la app sin instalar PostgreSQL manualmente.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import EmbeddedPostgres from 'embedded-postgres';
import * as fs from 'fs';
import { getEmbeddedPgConfig } from '../config/database.config';

@Injectable()
export class EmbeddedPostgresService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmbeddedPostgresService.name);
  private pg: EmbeddedPostgres | null = null;

  async onModuleInit() {
    const useEmbedded = (process.env.USE_EMBEDDED_POSTGRES || 'true').toLowerCase() === 'true';
    if (!useEmbedded) {
      this.logger.log('ℹ️  embedded-postgres desactivado (USE_EMBEDDED_POSTGRES=false)');
      return;
    }

    const cfg = getEmbeddedPgConfig();
    const alreadyInitialised = fs.existsSync(`${cfg.dataDir}/PG_VERSION`);

    this.pg = new EmbeddedPostgres({
      databaseDir: cfg.dataDir,
      user: cfg.user,
      password: cfg.password,
      port: cfg.port,
      persistent: true,
    });

    try {
      if (!alreadyInitialised) {
        this.logger.log(`📦 Inicializando PostgreSQL embebido en ${cfg.dataDir}...`);
        await this.pg.initialise();
      }
      this.logger.log(`🚀 Iniciando PostgreSQL embebido en puerto ${cfg.port}...`);
      await this.pg.start();

      try {
        await this.pg.createDatabase(cfg.database);
        this.logger.log(`📁 Base de datos "${cfg.database}" lista`);
      } catch (e: any) {
        if (String(e?.message || e).includes('already exists')) {
          this.logger.log(`📁 Base de datos "${cfg.database}" ya existía`);
        } else {
          throw e;
        }
      }
    } catch (error) {
      this.logger.error('❌ Error arrancando PostgreSQL embebido', error as Error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.pg) {
      try {
        await this.pg.stop();
        this.logger.log('🛑 PostgreSQL embebido detenido');
      } catch (e) {
        this.logger.warn(`No se pudo detener PG embebido: ${e}`);
      }
    }
  }
}
