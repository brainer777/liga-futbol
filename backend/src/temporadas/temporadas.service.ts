import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemporadaDto, UpdateTemporadaDto } from './dto/temporadas.dto';

@Injectable()
export class TemporadasService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.temporada.findMany({ orderBy: { anio: 'desc' } });
  }

  async findOne(id: string) {
    const t = await this.prisma.temporada.findUnique({ where: { id } });
    if (!t) throw new NotFoundException(`Temporada ${id} no encontrada`);
    return t;
  }

  async create(dto: CreateTemporadaDto) {
    if (new Date(dto.fechaInicio) >= new Date(dto.fechaFin)) {
      throw new BadRequestException('fechaInicio debe ser anterior a fechaFin');
    }
    // El unique pasó a ser per-liga ([ligaId, anio, nombre]); el chequeo de
    // duplicado va con findFirst y el middleware de tenant lo acota a la liga.
    const exists = await this.prisma.temporada.findFirst({
      where: { anio: dto.anio, nombre: dto.nombre },
    });
    if (exists) throw new ConflictException(`Ya existe la temporada "${dto.nombre}" ${dto.anio}`);
    return this.prisma.temporada.create({
      data: {
        nombre: dto.nombre,
        anio: dto.anio,
        fechaInicio: new Date(dto.fechaInicio),
        fechaFin: new Date(dto.fechaFin),
      },
    });
  }

  async update(id: string, dto: UpdateTemporadaDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.fechaInicio) data.fechaInicio = new Date(dto.fechaInicio);
    if (dto.fechaFin) data.fechaFin = new Date(dto.fechaFin);
    return this.prisma.temporada.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    const enUso = await this.prisma.torneo.count({ where: { temporadaId: id } });
    if (enUso > 0) throw new ConflictException(`No se puede eliminar: ${enUso} torneo(s) la usan.`);
    await this.prisma.temporada.delete({ where: { id } });
    return { ok: true };
  }
}
