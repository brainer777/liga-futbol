import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJugadorDto, UpdateJugadorDto } from './dto/jugadores.dto';
import { CreateDocumentoDto, UpdateDocumentoDto } from './dto/documentos.dto';
import { CreateEquipoJugadorDto, UpdateEquipoJugadorDto } from './dto/equipo-jugadores.dto';
import { validarJugador, CategoriaReglas } from './edad.validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class JugadoresService {
  constructor(private prisma: PrismaService) {}

  // ============================
  // JUGADORES
  // ============================

  findAll(filters: { estado?: string; search?: string; equipoId?: string } = {}) {
    const where: any = {};
    if (filters.estado) where.estadoValidacion = filters.estado;
    if (filters.search) {
      where.OR = [
        { nombres: { contains: filters.search, mode: 'insensitive' } },
        { apellidos: { contains: filters.search, mode: 'insensitive' } },
        { numeroDocumento: { contains: filters.search } },
      ];
    }
    if (filters.equipoId) {
      where.equipos = { some: { equipoId: filters.equipoId } };
    }
    return this.prisma.jugador.findMany({
      where,
      include: {
        documentos: { orderBy: { createdAt: 'desc' } },
        equipos: { include: { equipo: { include: { club: true, categoria: true } } } },
        _count: { select: { documentos: true, equipos: true } },
      },
      orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
    });
  }

  async findOne(id: string) {
    const j = await this.prisma.jugador.findUnique({
      where: { id },
      include: {
        documentos: { orderBy: { createdAt: 'desc' } },
        equipos: { include: { equipo: { include: { club: true, categoria: true } } } },
      },
    });
    if (!j) throw new NotFoundException(`Jugador ${id} no encontrado`);
    return j;
  }

  async create(dto: CreateJugadorDto, _userId?: string) {
    const fechaNacimiento = new Date(dto.fechaNacimiento);
    let estadoValidacion: any = 'pendiente';
    let alertas: string[] = [];

    if (dto.categoriaId) {
      const cat = await this.prisma.categoria.findUnique({ where: { id: dto.categoriaId } });
      if (!cat) throw new BadRequestException('Categoría inexistente para validación');
      const reglas: CategoriaReglas = {
        nombre: cat.nombre,
        edadMinima: cat.edadMinima,
        edadMaxima: cat.edadMaxima,
        permiteSinCedula: cat.permiteSinCedula,
        validaPorAnioNacimiento: cat.validaPorAnioNacimiento,
      };
      const result = validarJugador(reglas, {
        fechaNacimiento,
        anioNacimiento: dto.anioNacimiento,
        tipoDocumento: dto.tipoDocumento,
        numeroDocumento: dto.numeroDocumento,
      });
      alertas = result.alertas;
      estadoValidacion =
        result.nivel === 'ok' ? 'habilitado' : result.nivel === 'rechazado' ? 'rechazado' : 'observado';
    }

    return this.prisma.jugador.create({
      data: {
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        fechaNacimiento,
        anioNacimiento: dto.anioNacimiento,
        tipoDocumento: dto.tipoDocumento,
        numeroDocumento: dto.numeroDocumento,
        fotoUrl: dto.fotoUrl,
        observaciones: dto.observaciones,
        estadoValidacion,
      },
    });
  }

  async update(id: string, dto: UpdateJugadorDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.fechaNacimiento) data.fechaNacimiento = new Date(dto.fechaNacimiento);
    return this.prisma.jugador.update({ where: { id }, data });
  }

  async remove(id: string) {
    const j = await this.findOne(id);
    if (j.equipos.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar: el jugador pertenece a ${j.equipos.length} equipo(s). Quítalo primero.`,
      );
    }
    await this.prisma.jugador.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Revalida al jugador contra una categoría y actualiza su estado.
   * Útil cuando se sube un documento o cuando se corrige fecha de nacimiento.
   */
  async revalidar(jugadorId: string, categoriaId: string) {
    const jugador = await this.findOne(jugadorId);
    const cat = await this.prisma.categoria.findUnique({ where: { id: categoriaId } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    const result = validarJugador(
      {
        nombre: cat.nombre,
        edadMinima: cat.edadMinima,
        edadMaxima: cat.edadMaxima,
        permiteSinCedula: cat.permiteSinCedula,
        validaPorAnioNacimiento: cat.validaPorAnioNacimiento,
      },
      {
        fechaNacimiento: jugador.fechaNacimiento,
        anioNacimiento: jugador.anioNacimiento,
        tipoDocumento: jugador.tipoDocumento,
        numeroDocumento: jugador.numeroDocumento,
      },
    );
    const estadoValidacion =
      result.nivel === 'ok' ? 'habilitado' : result.nivel === 'rechazado' ? 'rechazado' : 'observado';
    return {
      jugador: await this.prisma.jugador.update({
        where: { id: jugadorId },
        data: { estadoValidacion },
      }),
      validacion: result,
    };
  }

  // ============================
  // DOCUMENTOS
  // ============================

  listarDocumentos(jugadorId: string) {
    return this.prisma.jugadorDocumento.findMany({
      where: { jugadorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async crearDocumento(dto: CreateDocumentoDto) {
    await this.findOne(dto.jugadorId);
    return this.prisma.jugadorDocumento.create({
      data: {
        jugadorId: dto.jugadorId,
        tipoDocumento: dto.tipoDocumento,
        archivoUrl: dto.archivoUrl,
        nombreArchivo: dto.nombreArchivo,
        tipoArchivo: dto.tipoArchivo,
        tamanoBytes: dto.tamanoBytes,
        observaciones: dto.observaciones,
      },
    });
  }

  async actualizarDocumento(id: string, dto: UpdateDocumentoDto, userId?: string) {
    const doc = await this.prisma.jugadorDocumento.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException(`Documento ${id} no encontrado`);
    const data: any = { ...dto };
    if (dto.estado === 'aprobado' || dto.estado === 'rechazado') {
      data.validadoPorId = userId;
      data.validadoEn = new Date();
    }
    return this.prisma.jugadorDocumento.update({ where: { id }, data });
  }

  async eliminarDocumento(id: string) {
    const doc = await this.prisma.jugadorDocumento.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException(`Documento ${id} no encontrado`);
    await this.prisma.jugadorDocumento.delete({ where: { id } });
    return { ok: true };
  }

  // ============================
  // EQUIPO_JUGADORES (plantilla)
  // ============================

  async listarPlantilla(equipoId: string) {
    return this.prisma.equipoJugador.findMany({
      where: { equipoId },
      include: { jugador: true },
      orderBy: [{ dorsal: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async agregarAEquipo(dto: CreateEquipoJugadorDto) {
    // Verificar que jugador y equipo existan
    await this.findOne(dto.jugadorId);
    const equipo = await this.prisma.equipo.findUnique({
      where: { id: dto.equipoId },
      include: { categoria: true },
    });
    if (!equipo) throw new NotFoundException(`Equipo ${dto.equipoId} no encontrado`);

    // Verificar regla de edad contra la categoría del equipo
    const jugador = await this.findOne(dto.jugadorId);
    const result = validarJugador(
      {
        nombre: equipo.categoria.nombre,
        edadMinima: equipo.categoria.edadMinima,
        edadMaxima: equipo.categoria.edadMaxima,
        permiteSinCedula: equipo.categoria.permiteSinCedula,
        validaPorAnioNacimiento: equipo.categoria.validaPorAnioNacimiento,
      },
      {
        fechaNacimiento: jugador.fechaNacimiento,
        anioNacimiento: jugador.anioNacimiento,
        tipoDocumento: jugador.tipoDocumento,
        numeroDocumento: jugador.numeroDocumento,
      },
    );

    const exists = await this.prisma.equipoJugador.findUnique({
      where: { equipoId_jugadorId: { equipoId: dto.equipoId, jugadorId: dto.jugadorId } },
    });
    if (exists) throw new BadRequestException('El jugador ya está en este equipo.');

    return this.prisma.equipoJugador.create({
      data: {
        equipoId: dto.equipoId,
        jugadorId: dto.jugadorId,
        dorsal: dto.dorsal,
        posicion: dto.posicion,
        estadoHabilitacion: result.nivel === 'ok' ? 'habilitado' : 'observado',
        motivoObservacion: result.alertas.length ? result.alertas.join(' • ') : null,
      },
      include: { jugador: true },
    });
  }

  async actualizarEquipoJugador(id: string, dto: UpdateEquipoJugadorDto, userId?: string) {
    const ej = await this.prisma.equipoJugador.findUnique({ where: { id } });
    if (!ej) throw new NotFoundException(`Registro ${id} no encontrado`);
    const data: any = { ...dto };
    if (dto.estadoHabilitacion === 'habilitado' || dto.estadoHabilitacion === 'rechazado') {
      data.validadoPorId = userId;
      data.validadoEn = new Date();
    }
    return this.prisma.equipoJugador.update({ where: { id }, data, include: { jugador: true } });
  }

  async quitarDeEquipo(id: string) {
    const ej = await this.prisma.equipoJugador.findUnique({ where: { id } });
    if (!ej) throw new NotFoundException(`Registro ${id} no encontrado`);
    await this.prisma.equipoJugador.delete({ where: { id } });
    return { ok: true };
  }
}
