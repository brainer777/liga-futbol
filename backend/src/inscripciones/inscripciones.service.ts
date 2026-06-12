import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInscripcionDto, UpdateInscripcionDto } from './dto/inscripciones.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class InscripcionesService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: { torneoId?: string; equipoId?: string; estado?: string } = {}) {
    return this.prisma.inscripcion.findMany({
      where: {
        ...(filters.torneoId ? { torneoId: filters.torneoId } : {}),
        ...(filters.equipoId ? { equipoId: filters.equipoId } : {}),
        ...(filters.estado ? { estado: filters.estado as any } : {}),
      },
      include: {
        torneo: { include: { categoria: true, temporada: true } },
        equipo: { include: { club: true, categoria: true } },
        pagos: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const i = await this.prisma.inscripcion.findUnique({
      where: { id },
      include: {
        torneo: { include: { categoria: true, temporada: true } },
        equipo: { include: { club: true, categoria: true } },
        pagos: { orderBy: { fechaPago: 'desc' } },
      },
    });
    if (!i) throw new NotFoundException(`Inscripción ${id} no encontrada`);
    return i;
  }

  async create(dto: CreateInscripcionDto, userId?: string) {
    const exists = await this.prisma.inscripcion.findUnique({
      where: { torneoId_equipoId: { torneoId: dto.torneoId, equipoId: dto.equipoId } },
    });
    if (exists) throw new ConflictException('El equipo ya está inscrito en este torneo.');
    return this.prisma.inscripcion.create({
      data: {
        torneoId: dto.torneoId,
        equipoId: dto.equipoId,
        costoInscripcion: dto.costoInscripcion,
        saldoPendiente: dto.costoInscripcion,
        fechaLimitePago: dto.fechaLimitePago ? new Date(dto.fechaLimitePago) : null,
        observaciones: dto.observaciones,
        creadoPorId: userId,
        estado: 'pendiente_pago',
      },
      include: { torneo: true, equipo: true },
    });
  }

  async update(id: string, dto: UpdateInscripcionDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.fechaLimitePago) data.fechaLimitePago = new Date(dto.fechaLimitePago);
    return this.prisma.inscripcion.update({ where: { id }, data });
  }

  async remove(id: string) {
    const ins = await this.findOne(id);
    if (ins.pagos.length > 0) {
      throw new ConflictException(`No se puede eliminar: la inscripción tiene ${ins.pagos.length} pago(s) registrado(s).`);
    }
    await this.prisma.inscripcion.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Recalcula el estado de la inscripción en función de los pagos.
   * - Si monto_pagado == 0  -> pendiente_pago
   * - Si 0 < monto_pagado < costo -> pago_parcial
   * - Si monto_pagado >= costo -> pagado
   * Si la fecha límite está vencida y hay saldo, marca 'vencido'.
   */
  async recomputeStatus(inscripcionId: string) {
    const ins = await this.prisma.inscripcion.findUnique({
      where: { id: inscripcionId },
      include: { pagos: true },
    });
    if (!ins) throw new NotFoundException(`Inscripción ${inscripcionId} no encontrada`);

    const totalPagado = ins.pagos.reduce(
      (acc, p) => acc + Number(p.monto),
      0,
    );
    const saldo = Math.max(0, Number(ins.costoInscripcion) - totalPagado);

    let estado: string = ins.estado;
    if (totalPagado <= 0) estado = 'pendiente_pago';
    else if (totalPagado < Number(ins.costoInscripcion)) estado = 'pago_parcial';
    else estado = 'pagado';

    if (
      saldo > 0 &&
      ins.fechaLimitePago &&
      new Date() > new Date(ins.fechaLimitePago) &&
      estado !== 'aprobado'
    ) {
      estado = 'vencido';
    }

    return this.prisma.inscripcion.update({
      where: { id: inscripcionId },
      data: { montoPagado: totalPagado, saldoPendiente: saldo, estado: estado as any },
    });
  }
}
