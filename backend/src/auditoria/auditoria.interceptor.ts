import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditoriaService } from './auditoria.service';

const METODOS_MUTACION = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
// Rutas que no se auditan (ruido / autenticación)
const RUTAS_EXCLUIDAS = ['/auth/login', '/health'];

/**
 * Interceptor global que registra las mutaciones (POST/PATCH/PUT/DELETE).
 *
 * - NO registra GET ni el cuerpo de la petición (evita loguear contraseñas/PII).
 * - Registra tanto éxitos como fallos (un DELETE denegado con 403 es relevante).
 * - El insert de auditoría es fire-and-forget con .catch(): nunca rompe ni
 *   demora la respuesta del usuario.
 * - Sólo observa (tap), nunca transforma la respuesta.
 */
@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(private readonly auditoria: AuditoriaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const metodo: string = req.method;
    const ruta: string = (req.originalUrl || req.url || '').split('?')[0];

    if (!METODOS_MUTACION.has(metodo) || RUTAS_EXCLUIDAS.some((r) => ruta.includes(r))) {
      return next.handle();
    }

    const base = {
      usuarioId: req.user?.id ?? null,
      usuarioEmail: req.user?.email ?? null,
      metodo,
      ruta: ruta.slice(0, 255),
      entidad: this.extraerEntidad(ruta),
      entidadIdParam: (req.params?.id as string) ?? null,
      ip: this.extraerIp(req),
    };

    return next.handle().pipe(
      tap({
        next: (res) => {
          const statusCode = context.switchToHttp().getResponse()?.statusCode ?? 200;
          // En creates (POST) el id está en la respuesta, no en params
          const entidadId =
            base.entidadIdParam ??
            (res && typeof res === 'object' && typeof (res as any).id === 'string' ? (res as any).id : null);
          this.auditoria
            .registrar({
              usuarioId: base.usuarioId,
              usuarioEmail: base.usuarioEmail,
              metodo: base.metodo,
              ruta: base.ruta,
              entidad: base.entidad,
              entidadId,
              statusCode,
              exitoso: true,
              ip: base.ip,
            })
            .catch(() => {});
        },
        error: (err) => {
          const statusCode = typeof err?.getStatus === 'function' ? err.getStatus() : 500;
          this.auditoria
            .registrar({
              usuarioId: base.usuarioId,
              usuarioEmail: base.usuarioEmail,
              metodo: base.metodo,
              ruta: base.ruta,
              entidad: base.entidad,
              entidadId: base.entidadIdParam,
              statusCode,
              exitoso: false,
              ip: base.ip,
            })
            .catch(() => {});
        },
      }),
    );
  }

  private extraerEntidad(ruta: string): string | null {
    const parts = ruta.split('/').filter(Boolean);
    const i = parts.indexOf('api');
    const seg = i >= 0 ? parts[i + 1] : parts[0];
    return seg ? seg.slice(0, 80) : null;
  }

  private extraerIp(req: any): string | null {
    const ip = req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '';
    return String(ip).slice(0, 64) || null;
  }
}
