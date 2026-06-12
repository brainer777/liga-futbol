import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipoDto, UpdateEquipoDto } from './dto/equipos.dto';

@Injectable()
export class EquiposService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: { clubId?: string; categoriaId?: string } = {}) {
    return this.prisma.equipo.findMany({
      where: {
        ...(filters.clubId ? { clubId: filters.clubId } : {}),
        ...(filters.categoriaId ? { categoriaId: filters.categoriaId } : {}),
      },
      include: {
        club: true,
        categoria: true,
        _count: { select: { jugadores: true, inscripciones: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const e = await this.prisma.equipo.findUnique({
      where: { id },
      include: {
        club: true,
        categoria: true,
        inscripciones: { include: { torneo: true } },
        jugadores: { include: { jugador: true }, orderBy: { dorsal: 'asc' } },
      },
    });
    if (!e) throw new NotFoundException(`Equipo ${id} no encontrado`);
    return e;
  }

  async create(dto: CreateEquipoDto) {
    const exists = await this.prisma.equipo.findUnique({
      where: { clubId_categoriaId_nombre: { clubId: dto.clubId, categoriaId: dto.categoriaId, nombre: dto.nombre } },
    });
    if (exists) throw new ConflictException(`Ya existe el equipo "${dto.nombre}" en esa categoría/club.`);
    return this.prisma.equipo.create({ data: dto, include: { club: true, categoria: true } });
  }

  async update(id: string, dto: UpdateEquipoDto) {
    await this.findOne(id);
    return this.prisma.equipo.update({ where: { id }, data: dto, include: { club: true, categoria: true } });
  }

  async remove(id: string) {
    await this.findOne(id);
    const enUso = await this.prisma.inscripcion.count({ where: { equipoId: id } });
    if (enUso > 0) throw new ConflictException(`No se puede eliminar: ${enUso} inscripción(es) asociada(s).`);
    await this.prisma.equipo.delete({ where: { id } });
    return { ok: true };
  }
}
