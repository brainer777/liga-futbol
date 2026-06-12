import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InscripcionesService } from '../inscripciones/inscripciones.service';
import { CreatePagoDto } from './dto/pagos.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class PagosService {
  constructor(
    private prisma: PrismaService,
    private inscripciones: InscripcionesService,
  ) {}

  findAll(filters: { inscripcionId?: string } = {}) {
    return this.prisma.pago.findMany({
      where: { ...(filters.inscripcionId ? { inscripcionId: filters.inscripcionId } : {}) },
      include: { inscripcion: { include: { equipo: { include: { club: true } }, torneo: true } } },
      orderBy: { fechaPago: 'desc' },
    });
  }

  findByInscripcion(inscripcionId: string) {
    return this.prisma.pago.findMany({
      where: { inscripcionId },
      orderBy: { fechaPago: 'desc' },
    });
  }

  async create(dto: CreatePagoDto, userId?: string) {
    const ins = await this.prisma.inscripcion.findUnique({ where: { id: dto.inscripcionId } });
    if (!ins) throw new NotFoundException(`Inscripción ${dto.inscripcionId} no encontrada`);
    if (dto.metodoPago === 'efectivo' && !dto.numeroRecibo) {
      throw new BadRequestException('Pago en efectivo requiere número de recibo.');
    }
    if (dto.metodoPago === 'transferencia' && !dto.referenciaTransferencia) {
      throw new BadRequestException('Pago por transferencia requiere referencia.');
    }
    const pago = await this.prisma.pago.create({
      data: {
        inscripcionId: dto.inscripcionId,
        monto: dto.monto,
        metodoPago: dto.metodoPago,
        numeroRecibo: dto.numeroRecibo,
        referenciaTransferencia: dto.referenciaTransferencia,
        observaciones: dto.observaciones,
        comprobanteUrl: dto.comprobanteUrl,
        fechaPago: dto.fechaPago ? new Date(dto.fechaPago) : new Date(),
        registradoPorId: userId,
      },
    });
    // Recalcular estado de la inscripción
    await this.inscripciones.recomputeStatus(dto.inscripcionId);
    return pago;
  }

  async remove(id: string) {
    const pago = await this.prisma.pago.findUnique({ where: { id } });
    if (!pago) throw new NotFoundException(`Pago ${id} no encontrado`);
    await this.prisma.pago.delete({ where: { id } });
    await this.inscripciones.recomputeStatus(pago.inscripcionId);
    return { ok: true };
  }
}
