import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClubDto, UpdateClubDto } from './dto/clubes.dto';

@Injectable()
export class ClubesService {
  constructor(private prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.club.findMany({
      where: includeInactive ? undefined : { estado: 'activo' },
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { equipos: true } } },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.club.findUnique({
      where: { id },
      include: { equipos: { include: { categoria: true } } },
    });
    if (!c) throw new NotFoundException(`Club ${id} no encontrado`);
    return c;
  }

  create(dto: CreateClubDto) {
    return this.prisma.club.create({ data: dto });
  }

  async update(id: string, dto: UpdateClubDto) {
    await this.findOne(id);
    return this.prisma.club.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    const enUso = await this.prisma.equipo.count({ where: { clubId: id } });
    if (enUso > 0) throw new ConflictException(`No se puede eliminar: ${enUso} equipo(s) pertenecen a este club.`);
    await this.prisma.club.delete({ where: { id } });
    return { ok: true };
  }
}
