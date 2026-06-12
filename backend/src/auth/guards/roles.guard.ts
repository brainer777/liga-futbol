import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('No autenticado');
    const userRoles: string[] = (user.roles || []).map((r: any) => r.nombre);
    const ok = requiredRoles.some((r) => userRoles.includes(r));
    if (!ok) {
      throw new ForbiddenException(
        `Rol requerido: ${requiredRoles.join(' | ')}. Tus roles: ${userRoles.join(', ')}`,
      );
    }
    return true;
  }
}
