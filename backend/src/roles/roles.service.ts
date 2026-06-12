import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRolDto, UpdateRolDto } from './dto/roles.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.rol.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const rol = await this.prisma.rol.findUnique({
      where: { id },
      include: { usuarios: { include: { usuario: true } } },
    });
    if (!rol) throw new NotFoundException(`Rol ${id} no encontrado`);
    return rol;
  }

  async create(dto: CreateRolDto) {
    const exists = await this.prisma.rol.findUnique({ where: { nombre: dto.nombre } });
    if (exists) throw new ConflictException(`Ya existe un rol con nombre "${dto.nombre}"`);
    return this.prisma.rol.create({ data: dto });
  }

  async update(id: string, dto: UpdateRolDto) {
    await this.findOne(id);
    return this.prisma.rol.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    const enUso = await this.prisma.usuarioRol.count({ where: { rolId: id } });
    if (enUso > 0) {
      throw new ConflictException(
        `No se puede eliminar: el rol está asignado a ${enUso} usuario(s). Quítalo primero.`,
      );
    }
    await this.prisma.rol.delete({ where: { id } });
    return { ok: true };
  }
}
