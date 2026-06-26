import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

interface UserRole {
  id: string;
  nombre: string;
  ligaId: string | null;
}

/**
 * Guard de PLATAFORMA (no liga-aware). Exige un rol Superadministrador de
 * plataforma (`ligaId null`). A diferencia de RolesGuard, NO resuelve la liga
 * del request: es para endpoints cross-liga de gestión de la plataforma (p.ej.
 * el CRUD de ligas), que no tienen —ni deben tener— contexto de tenant.
 */
@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('No autenticado');
    const roles: UserRole[] = user.roles || [];
    const ok = roles.some((r) => r.nombre === 'Superadministrador' && r.ligaId == null);
    if (!ok) {
      throw new ForbiddenException('Solo el Superadministrador de plataforma puede gestionar ligas');
    }
    return true;
  }
}
