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

  async getLigaId(): Promise<string> {
    const cached = this.cls.get<string | undefined>('ligaId');
    if (cached) return cached;

    const slug = this.cls.get<string | null>('ligaSlug');
    let ligaId: string;

    if (slug) {
      const liga = await this.prisma.liga.findFirst({
        where: { slug, estado: 'activo' },
        select: { id: true },
      });
      if (!liga) throw new NotFoundException(`Liga "${slug}" no encontrada`);
      ligaId = liga.id;
    } else {
      const ligas = await this.prisma.liga.findMany({ take: 2, select: { id: true } });
      if (ligas.length === 1) {
        ligaId = ligas[0].id;
      } else {
        throw new BadRequestException(
          'Falta el encabezado X-Liga-Slug: hay múltiples ligas y no se puede resolver el contexto.',
        );
      }
    }

    this.cls.set('ligaId', ligaId);
    return ligaId;
  }
}
