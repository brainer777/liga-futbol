import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto, RolAsignacionDto, UpdateUsuarioDto } from './dto/usuarios.dto';

// Roles de PLATAFORMA: van sin liga (ligaId null) y valen en todas. El resto son
// roles de liga y DEBEN anclarse a una liga concreta.
const PLATFORM_ROLES = new Set(['Superadministrador']);

// Include de roles con su liga, para que el frontend pueda mostrar "Rol · Liga".
const ROLES_INCLUDE = { roles: { include: { rol: true, liga: true } } } as const;

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const usuarios = await this.prisma.usuario.findMany({
      include: ROLES_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return usuarios.map((u) => this.sanitize(u));
  }

  async findOne(id: string) {
    const u = await this.prisma.usuario.findUnique({
      where: { id },
      include: ROLES_INCLUDE,
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
        roles: dto.roles?.length ? { create: await this.resolveRoles(dto.roles) } : undefined,
      },
      include: ROLES_INCLUDE,
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
      // Resolvemos ANTES de borrar, así una asignación inválida no deja al
      // usuario sin roles.
      const resolved = dto.roles.length ? await this.resolveRoles(dto.roles) : [];
      await this.prisma.usuarioRol.deleteMany({ where: { usuarioId: id } });
      if (resolved.length) {
        await this.prisma.usuarioRol.createMany({
          data: resolved.map((r) => ({ usuarioId: id, rolId: r.rolId, ligaId: r.ligaId })),
        });
      }
    }

    const u = await this.prisma.usuario.update({
      where: { id },
      include: ROLES_INCLUDE,
      data,
    });
    return this.sanitize(u);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.usuario.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Resuelve asignaciones {nombre, ligaSlug} a {rolId, ligaId}, anclando cada rol
   * a su liga. Reglas:
   *  - rol de plataforma (Superadministrador): SIN liga (ligaId null);
   *  - rol de liga: DEBE traer una ligaSlug existente → su ligaId.
   * Deduplica por (rolId, ligaId) para no chocar con el unique del modelo.
   */
  private async resolveRoles(asignaciones: RolAsignacionDto[]) {
    const nombres = [...new Set(asignaciones.map((a) => a.nombre))];
    const roles = await this.prisma.rol.findMany({ where: { nombre: { in: nombres } } });
    const rolPorNombre = new Map(roles.map((r) => [r.nombre, r]));
    const faltantes = nombres.filter((n) => !rolPorNombre.has(n));
    if (faltantes.length) throw new NotFoundException(`Roles inexistentes: ${faltantes.join(', ')}`);

    // Resolver los slugs de liga referidos (una sola consulta).
    const slugs = [...new Set(asignaciones.map((a) => a.ligaSlug).filter((s): s is string => !!s))];
    const ligas = slugs.length
      ? await this.prisma.liga.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } })
      : [];
    const ligaPorSlug = new Map(ligas.map((l) => [l.slug, l.id]));
    const slugsFaltantes = slugs.filter((s) => !ligaPorSlug.has(s));
    if (slugsFaltantes.length) throw new NotFoundException(`Ligas inexistentes: ${slugsFaltantes.join(', ')}`);

    const out = new Map<string, { rolId: string; ligaId: string | null }>();
    for (const a of asignaciones) {
      const rol = rolPorNombre.get(a.nombre)!;
      const esPlataforma = PLATFORM_ROLES.has(a.nombre);
      let ligaId: string | null;
      if (esPlataforma) {
        if (a.ligaSlug) throw new BadRequestException(`El rol "${a.nombre}" es de plataforma y no se asigna a una liga.`);
        ligaId = null;
      } else {
        if (!a.ligaSlug) throw new BadRequestException(`El rol "${a.nombre}" requiere una liga.`);
        ligaId = ligaPorSlug.get(a.ligaSlug)!;
      }
      out.set(`${rol.id}:${ligaId ?? '∅'}`, { rolId: rol.id, ligaId });
    }
    return [...out.values()];
  }

  private sanitize(u: any) {
    const { passwordHash, ...rest } = u;
    return {
      ...rest,
      roles: u.roles.map((ur: any) => ({
        id: ur.rol.id,
        nombre: ur.rol.nombre,
        ligaId: ur.ligaId,
        ligaNombre: ur.liga?.nombre ?? null,
        ligaSlug: ur.liga?.slug ?? null,
      })),
    };
  }
}
