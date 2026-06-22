import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSedeDto, UpdateSedeDto } from './dto/sedes.dto';

@Injectable()
export class SedesService {
  constructor(private prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.sede.findMany({
      where: includeInactive ? undefined : { estado: 'activo' },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const s = await this.prisma.sede.findUnique({ where: { id } });
    if (!s) throw new NotFoundException(`Sede ${id} no encontrada`);
    return s;
  }

  create(dto: CreateSedeDto) {
    return this.prisma.sede.create({ data: dto });
  }

  async update(id: string, dto: UpdateSedeDto) {
    await this.findOne(id);
    return this.prisma.sede.update({ where: { id }, data: dto });
  }

  // NOTA: la sede aún no se enlaza a Partido (eso llega en el paso de asignación).
  // Cuando exista Partido.sedeId, acá se bloquea el borrado si está en uso, como en árbitros.
  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.sede.delete({ where: { id } });
    return { ok: true };
  }
}
