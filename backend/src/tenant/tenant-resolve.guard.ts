import { Injectable, CanActivate } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

/**
 * Resuelve la liga del request (header X-Liga-Slug o fallback) y la deja en el
 * contexto CLS, SIN validar membresía (las rutas públicas no tienen usuario).
 * Va en `PublicoController` para que el enforcement de Prisma tenga `ligaId`
 * resuelto antes de cualquier query — simétrico a cómo RolesGuard cubre el
 * lado autenticado. Un único punto, no `getLigaId()` por método.
 */
@Injectable()
export class TenantResolveGuard implements CanActivate {
  constructor(private readonly tenant: TenantContextService) {}

  async canActivate(): Promise<boolean> {
    await this.tenant.getLigaId();
    return true;
  }
}
