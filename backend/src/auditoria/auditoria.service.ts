import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RegistroAuditoria {
  usuarioId?: string | null;
  usuarioEmail?: string | null;
  metodo: string;
  ruta: string;
  entidad?: string | null;
  entidadId?: string | null;
  statusCode: number;
  exitoso: boolean;
  ip?: string | null;
}

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Inserta un registro de auditoría. Pensado para fire-and-forget. */
  registrar(data: RegistroAuditoria) {
    return this.prisma.auditoria.create({ data });
  }

  /** Lista registros recientes, con filtros opcionales. */
  listar(filtros: { entidad?: string; usuarioId?: string; limit?: number }) {
    const limit = Math.min(Math.max(filtros.limit ?? 100, 1), 500);
    return this.prisma.auditoria.findMany({
      where: {
        entidad: filtros.entidad || undefined,
        usuarioId: filtros.usuarioId || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
