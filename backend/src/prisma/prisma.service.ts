import { Injectable, OnModuleInit, OnModuleDestroy, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { TENANT_MODELS, applyTenantScope } from '../tenant/tenant-scope';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly cls: ClsService) {
    super();
    // Enforcement multi-tenant (fase 3c). $use mutará ESTE cliente, así que todos
    // los servicios que inyectan PrismaService quedan cubiertos sin tocarlos.
    // (deprecado en Prisma 7; la lógica vive en tenant-scope.ts para portarlo a
    // $extends sin reescribir.)
    this.$use(async (params, next) => {
      const { model, action } = params;
      if (!model || !TENANT_MODELS.has(model)) return next(params);
      // Fuera de un request (scripts/bootstrap; el seed usa su propio cliente) o
      // bypass explícito vía runUnscoped → sin scoping.
      if (!this.cls.isActive() || this.cls.get('tenantBypass')) return next(params);
      const ligaId = this.cls.get<string | undefined>('ligaId');
      if (!ligaId) {
        // Fail-closed: una query tenant dentro de un request sin liga resuelta es
        // un bug de cableado, no "devolver todo".
        throw new ForbiddenException(
          `Contexto de liga no resuelto para ${model}.${action} (multi-tenant fail-closed).`,
        );
      }
      params.args = applyTenantScope(action, params.args, ligaId);
      return next(params);
    });
  }

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
