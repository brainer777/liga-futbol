import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArbitroDto, UpdateArbitroDto } from './dto/arbitros.dto';

@Injectable()
export class ArbitrosService {
  constructor(private prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.arbitro.findMany({
      where: includeInactive ? undefined : { estado: 'activo' },
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { partidos: true } } },
    });
  }

  async findOne(id: string) {
    const a = await this.prisma.arbitro.findUnique({ where: { id } });
    if (!a) throw new NotFoundException(`Árbitro ${id} no encontrado`);
    return a;
  }

  create(dto: CreateArbitroDto) {
    return this.prisma.arbitro.create({ data: dto });
  }

  async update(id: string, dto: UpdateArbitroDto) {
    await this.findOne(id);
    return this.prisma.arbitro.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    const enUso = await this.prisma.partido.count({ where: { arbitroId: id } });
    if (enUso > 0)
      throw new ConflictException(
        `No se puede eliminar: ${enUso} partido(s) tienen asignado este árbitro. Desactívalo en su lugar.`,
      );
    await this.prisma.arbitro.delete({ where: { id } });
    return { ok: true };
  }
}
