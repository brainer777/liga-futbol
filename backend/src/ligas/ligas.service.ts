import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLigaDto, UpdateLigaDto } from './dto/ligas.dto';

// Default de branding para la config de una liga nueva (coincide con la migración
// y con ConfiguracionService.DEFAULTS).
const COLOR_DEFAULT = '142 70% 35%';

// Categorías por defecto al crear una liga (mismas que el seed base), para que la
// liga nueva quede usable de inmediato (sin esto no puede hostear torneos).
const CATEGORIAS_DEFAULT = [
  { nombre: 'Sub8', edadMinima: 6, edadMaxima: 8, permiteSinCedula: true, validaPorAnioNacimiento: true },
  { nombre: 'Sub10', edadMinima: 8, edadMaxima: 10, permiteSinCedula: true, validaPorAnioNacimiento: true },
  { nombre: 'Sub12', edadMinima: 10, edadMaxima: 12, permiteSinCedula: true, validaPorAnioNacimiento: true },
  { nombre: 'Sub14', edadMinima: 12, edadMaxima: 14, permiteSinCedula: false, validaPorAnioNacimiento: false },
  { nombre: 'Sub16', edadMinima: 14, edadMaxima: 16, permiteSinCedula: false, validaPorAnioNacimiento: false },
  { nombre: 'Sub18', edadMinima: 16, edadMaxima: 18, permiteSinCedula: false, validaPorAnioNacimiento: false },
  { nombre: 'Libre', edadMinima: 18, edadMaxima: 35, permiteSinCedula: false, validaPorAnioNacimiento: false },
  { nombre: 'Master', edadMinima: 35, edadMaxima: 99, permiteSinCedula: false, validaPorAnioNacimiento: false },
];

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

    // Crea la liga con su Configuracion, las categorías por defecto y una
    // temporada del año en curso, todo en una operación anidada. El middleware
    // $use solo intercepta el modelo top-level (Liga, no-tenant), así que los
    // creates anidados (que SÍ son tenant) no se scopean ni hacen fail-closed:
    // su ligaId lo fija la relación. Así la liga nueva queda lista para usar.
    const anio = new Date().getFullYear();
    return this.prisma.liga.create({
      data: {
        nombre: dto.nombre,
        slug: dto.slug,
        configuracion: { create: { nombreLiga: dto.nombre, colorPrimario: COLOR_DEFAULT } },
        categorias: { create: CATEGORIAS_DEFAULT },
        temporadas: {
          create: {
            nombre: `Temporada ${anio}`,
            anio,
            fechaInicio: new Date(`${anio}-01-01`),
            fechaFin: new Date(`${anio}-12-31`),
            estado: 'activa',
          },
        },
      },
      include: {
        configuracion: { select: { nombreLiga: true, colorPrimario: true } },
        _count: { select: { categorias: true, temporadas: true } },
      },
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
