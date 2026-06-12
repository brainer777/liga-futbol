import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto/categorias.dto';

@Injectable()
export class CategoriasService {
  constructor(private prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.categoria.findMany({
      where: includeInactive ? undefined : { estado: 'activo' },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.categoria.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Categoría ${id} no encontrada`);
    return c;
  }

  async create(dto: CreateCategoriaDto) {
    if (dto.edadMinima != null && dto.edadMaxima != null && dto.edadMinima > dto.edadMaxima) {
      throw new BadRequestException('edadMinima no puede ser mayor que edadMaxima');
    }
    const exists = await this.prisma.categoria.findUnique({ where: { nombre: dto.nombre } });
    if (exists) throw new ConflictException(`Ya existe la categoría "${dto.nombre}"`);
    return this.prisma.categoria.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoriaDto) {
    await this.findOne(id);
    if (dto.edadMinima != null && dto.edadMaxima != null && dto.edadMinima > dto.edadMaxima) {
      throw new BadRequestException('edadMinima no puede ser mayor que edadMaxima');
    }
    return this.prisma.categoria.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    const enUso = await this.prisma.equipo.count({ where: { categoriaId: id } });
    if (enUso > 0) {
      throw new ConflictException(`No se puede eliminar: ${enUso} equipo(s) usan esta categoría.`);
    }
    await this.prisma.categoria.delete({ where: { id } });
    return { ok: true };
  }
}
