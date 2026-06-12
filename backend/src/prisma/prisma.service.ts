import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Conectado a la base de datos PostgreSQL');
    } catch (error) {
      this.logger.error('❌ No se pudo conectar a la base de datos', error as Error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Desconectado de la base de datos');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('No se puede limpiar la BD en producción');
    }
    // Orden por dependencias
    const tablenames = [
      'pagos',
      'inscripciones',
      'torneos',
      'equipos',
      'clubes',
      'categorias',
      'temporadas',
      'usuario_roles',
      'usuarios',
      'roles',
      'permisos',
    ];
    for (const table of tablenames) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
  }
}
