import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  async remove(id: string) {
    await this.findOne(id);
    const enUso = await this.prisma.partido.count({ where: { sedeId: id } });
    if (enUso > 0)
      throw new ConflictException(
        `No se puede eliminar: ${enUso} partido(s) tienen asignada esta sede. Desactívala en su lugar.`,
      );
    await this.prisma.sede.delete({ where: { id } });
    return { ok: true };
  }
}
