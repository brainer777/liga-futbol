import { SetMetadata } from '@nestjs/common';

export const SOFT_TENANT_KEY = 'softTenant';

/**
 * Marca una ruta como "tenant tolerante": el TenantResolveGuard resuelve la liga
 * sin fail-closed (sin slug + 2+ ligas → no rompe; el handler decide, p.ej.
 * branding por defecto). Un slug explícito inexistente sigue dando 404.
 */
export const SoftTenant = () => SetMetadata(SOFT_TENANT_KEY, true);
