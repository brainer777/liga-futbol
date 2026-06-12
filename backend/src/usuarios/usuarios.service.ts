import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto, UpdateUsuarioDto } from './dto/usuarios.dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const usuarios = await this.prisma.usuario.findMany({
      include: { roles: { include: { rol: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return usuarios.map((u) => this.sanitize(u));
  }

  async findOne(id: string) {
    const u = await this.prisma.usuario.findUnique({
      where: { id },
      include: { roles: { include: { rol: true } } },
    });
    if (!u) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return this.sanitize(u);
  }

  async create(dto: CreateUsuarioDto) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.prisma.usuario.findUnique({ where: { email } });
    if (exists) throw new ConflictException(`Ya existe un usuario con email ${email}`);

    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        email,
        passwordHash,
        roles: dto.roles?.length
          ? {
              create: await this.resolveRoles(dto.roles),
            }
          : undefined,
      },
      include: { roles: { include: { rol: true } } },
    });
    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.nombre) data.nombre = dto.nombre;
    if (dto.email) data.email = dto.email.toLowerCase().trim();
    if (dto.password) {
      const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
      data.passwordHash = await bcrypt.hash(dto.password, rounds);
    }
    if (dto.estado) data.estado = dto.estado;

    if (dto.roles) {
      await this.prisma.usuarioRol.deleteMany({ where: { usuarioId: id } });
      if (dto.roles.length) {
        const resolved = await this.resolveRoles(dto.roles);
        await this.prisma.usuarioRol.createMany({
          data: resolved.map((r) => ({ usuarioId: id, rolId: r.rolId })),
        });
      }
    }

    const u = await this.prisma.usuario.update({
      where: { id },
      include: { roles: { include: { rol: true } } },
      data,
    });
    return this.sanitize(u);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.usuario.delete({ where: { id } });
    return { ok: true };
  }

  private async resolveRoles(nombres: string[]) {
    const roles = await this.prisma.rol.findMany({ where: { nombre: { in: nombres } } });
    const encontrados = new Set(roles.map((r) => r.nombre));
    const faltantes = nombres.filter((n) => !encontrados.has(n));
    if (faltantes.length) {
      throw new NotFoundException(`Roles inexistentes: ${faltantes.join(', ')}`);
    }
    return roles.map((r) => ({ rolId: r.id }));
  }

  private sanitize(u: any) {
    const { passwordHash, ...rest } = u;
    return {
      ...rest,
      roles: u.roles.map((ur: any) => ({ id: ur.rol.id, nombre: ur.rol.nombre })),
    };
  }
}
