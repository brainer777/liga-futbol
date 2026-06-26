import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { TenantContextService } from '../../tenant/tenant-context.service';

interface UserRole {
  id: string;
  nombre: string;
  ligaId: string | null;
}

/**
 * Guard liga-aware (fase 3b-2). En toda ruta de datos tenant (las que llevan
 * `@UseGuards(JwtAuthGuard, RolesGuard)`):
 *  1. resuelve la liga del request (header X-Liga-Slug o fallback);
 *  2. valida MEMBRESÍA: el usuario debe ser de plataforma (rol con ligaId null,
 *     p.ej. Superadministrador → cualquier liga) o tener algún rol EN esa liga;
 *  3. si la ruta declara `@Roles(...)`, exige uno de esos roles EN la liga
 *     resuelta (los roles de plataforma cuentan en todas).
 *
 * Así, "Administrador de liga" en la liga A NO habilita en la B, y un header
 * X-Liga-Slug de una liga ajena devuelve 403 en vez de filtrar datos.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenant: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('No autenticado');

    const roles: UserRole[] = user.roles || [];

    // Liga del request + membresía. Los roles de plataforma (ligaId null) valen
    // en cualquier liga; los demás solo en la suya.
    const ligaId = await this.tenant.getLigaId();
    const rolesEnLiga = roles.filter((r) => r.ligaId == null || r.ligaId === ligaId);
    if (rolesEnLiga.length === 0) {
      throw new ForbiddenException('No tenés acceso a esta liga');
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // autenticado y miembro de la liga; no se exige un rol puntual
    }

    const nombres = rolesEnLiga.map((r) => r.nombre);
    const ok = requiredRoles.some((r) => nombres.includes(r));
    if (!ok) {
      throw new ForbiddenException(
        `Rol requerido: ${requiredRoles.join(' | ')}. Tus roles en esta liga: ${nombres.join(', ') || '(ninguno)'}`,
      );
    }
    return true;
  }
}
