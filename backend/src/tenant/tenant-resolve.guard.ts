import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from './tenant-context.service';
import { SOFT_TENANT_KEY } from './soft-tenant.decorator';

/**
 * Resuelve la liga del request (header X-Liga-Slug o fallback) y la deja en el
 * contexto CLS, SIN validar membresía (las rutas públicas no tienen usuario).
 * Va en `PublicoController` para que el enforcement de Prisma tenga `ligaId`
 * resuelto antes de cualquier query — simétrico a cómo RolesGuard cubre el
 * lado autenticado. Un único punto, no `getLigaId()` por método.
 *
 * Rutas marcadas con `@SoftTenant()` resuelven sin fail-closed (no rompen si no
 * hay liga resoluble; el handler decide qué devolver, p.ej. branding default).
 * El resto es fail-closed (400 si falta contexto). Un slug explícito inexistente
 * da 404 en ambos casos.
 */
@Injectable()
export class TenantResolveGuard implements CanActivate {
  constructor(
    private readonly tenant: TenantContextService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const soft = this.reflector.getAllAndOverride<boolean>(SOFT_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (soft) await this.tenant.tryGetLigaId();
    else await this.tenant.getLigaId();
    return true;
  }
}
