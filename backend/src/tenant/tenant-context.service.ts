import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Resuelve la liga (tenant) del request actual y la memoiza en el contexto CLS.
 *
 * Fuentes (en orden):
 * - header `X-Liga-Slug` (lo stashea el middleware de ClsModule en `ligaSlug`).
 * - fallback: la ÚNICA liga existente, MIENTRAS exista una sola. Es una muleta
 *   auto-desarmable: en cuanto hay 2+ ligas y no vino slug, pasa a fail-closed
 *   (400) en vez de filtrar silenciosamente la liga "principal".
 *
 * NOTA (fase 3b-1): todavía NO valida que el usuario sea miembro de la liga
 * resuelta; esa validación llega en 3b-2 (RolesGuard liga-aware), antes de que
 * el enforcement (3c) empiece a usar este ligaId para acotar queries.
 */
@Injectable()
export class TenantContextService {
  constructor(
    private readonly cls: ClsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Resuelve la liga del request SIN fail-closed: devuelve null cuando no se
   * puede resolver por ausencia de contexto (sin slug y con 2+ ligas). Un slug
   * EXPLÍCITO inexistente SÍ es error (404): no se enmascara una URL mal escrita.
   * Para endpoints tolerantes (p.ej. branding público), que prefieren defaults a
   * romper. El resto debe usar `getLigaId()` (fail-closed).
   */
  async tryGetLigaId(): Promise<string | null> {
    const cached = this.cls.get<string | undefined>('ligaId');
    if (cached) return cached;

    const slug = this.cls.get<string | null>('ligaSlug');
    if (slug) {
      const liga = await this.prisma.liga.findFirst({
        where: { slug, estado: 'activo' },
        select: { id: true },
      });
      if (!liga) throw new NotFoundException(`Liga "${slug}" no encontrada`);
      this.cls.set('ligaId', liga.id);
      return liga.id;
    }

    const ligas = await this.prisma.liga.findMany({ take: 2, select: { id: true } });
    if (ligas.length === 1) {
      this.cls.set('ligaId', ligas[0].id);
      return ligas[0].id;
    }
    return null; // sin slug y con 2+ ligas: no resoluble (lo decide el caller)
  }

  async getLigaId(): Promise<string> {
    const ligaId = await this.tryGetLigaId();
    if (!ligaId) {
      throw new BadRequestException(
        'Falta el encabezado X-Liga-Slug: hay múltiples ligas y no se puede resolver el contexto.',
      );
    }
    return ligaId;
  }

  /**
   * Ejecuta `fn` SIN scoping de tenant (el enforcement de Prisma se saltea).
   * Único punto de bypass permitido — para vistas cross-liga de plataforma o
   * tareas de sistema. Nunca setear el flag a mano en código de negocio.
   */
  async runUnscoped<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.cls.get('tenantBypass');
    this.cls.set('tenantBypass', true);
    try {
      return await fn();
    } finally {
      this.cls.set('tenantBypass', prev ?? false);
    }
  }
}
