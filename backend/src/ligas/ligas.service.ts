import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLigaDto, UpdateLigaDto } from './dto/ligas.dto';

// Default de branding para la config de una liga nueva (coincide con la migración
// y con ConfiguracionService.DEFAULTS).
const COLOR_DEFAULT = '142 70% 35%';

/**
 * CRUD de ligas para la PLATAFORMA (Superadministrador). `Liga` está fuera del
 * enforcement de tenant (no está en TENANT_MODELS), así que estas queries no
 * necesitan contexto de liga ni header X-Liga-Slug.
 */
@Injectable()
export class LigasService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.liga.findMany({
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        slug: true,
        estado: true,
        createdAt: true,
        _count: { select: { torneos: true, equipos: true, usuarioRoles: true } },
      },
    });
  }

  async create(dto: CreateLigaDto) {
    const existente = await this.prisma.liga.findUnique({ where: { slug: dto.slug }, select: { id: true } });
    if (existente) throw new ConflictException(`Ya existe una liga con el slug "${dto.slug}".`);

    // Crea la liga y su Configuracion (1:1) en una sola operación anidada. El
    // middleware $use solo intercepta el modelo top-level (Liga, no-tenant), así
    // que el create anidado de Configuracion no se scopea ni hace fail-closed.
    return this.prisma.liga.create({
      data: {
        nombre: dto.nombre,
        slug: dto.slug,
        configuracion: { create: { nombreLiga: dto.nombre, colorPrimario: COLOR_DEFAULT } },
      },
      include: { configuracion: { select: { nombreLiga: true, colorPrimario: true } } },
    });
  }

  async update(id: string, dto: UpdateLigaDto) {
    const liga = await this.prisma.liga.findUnique({ where: { id }, select: { id: true, estado: true } });
    if (!liga) throw new NotFoundException(`Liga ${id} no encontrada`);

    // No dejar desactivar la última liga activa: el dashboard se gatea contra
    // las ligas activas del usuario; sin ninguna activa, ni el Superadmin podría
    // volver a entrar a reactivarla (quedaría solo recuperable por DB).
    if (dto.estado === 'inactivo' && liga.estado === 'activo') {
      const activas = await this.prisma.liga.count({ where: { estado: 'activo' } });
      if (activas <= 1) {
        throw new ConflictException('No se puede desactivar la única liga activa.');
      }
    }

    return this.prisma.liga.update({
      where: { id },
      data: dto,
      select: { id: true, nombre: true, slug: true, estado: true },
    });
  }
}
