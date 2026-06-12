import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTorneoDto, UpdateTorneoDto } from './dto/torneos.dto';
import { GenerarFixtureDto, UpdatePartidoDto, ReprogramarPartidoDto } from './dto/fixture.dto';
import {
  generarFixture, esFormatoValido, EquipoSlot, ResultadoFixture,
} from './fixture.generator';

@Injectable()
export class TorneosService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // CRUD de torneo (existente)
  // ============================================================

  findAll() {
    return this.prisma.torneo.findMany({
      include: { temporada: true, categoria: true, _count: { select: { inscripciones: true, partidos: true, fases: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const t = await this.prisma.torneo.findUnique({
      where: { id },
      include: {
        _count: { select: { partidos: true, inscripciones: true, fases: true } },
        temporada: true,
        categoria: true,
        inscripciones: { include: { equipo: { include: { club: true } } } },
        fases: {
          orderBy: { orden: 'asc' },
          include: {
            grupos: { include: { equipos: { include: { grupo: true } } } },
            partidos: {
              orderBy: [{ jornada: 'asc' }, { createdAt: 'asc' }],
              include: {
                grupo: true,
                fase: true,
              },
            },
          },
        },
      },
    });
    if (!t) throw new NotFoundException(`Torneo ${id} no encontrado`);
    return t;
  }

  create(dto: CreateTorneoDto) {
    return this.prisma.torneo.create({ data: dto, include: { temporada: true, categoria: true } });
  }

  async update(id: string, dto: UpdateTorneoDto) {
    await this.findOne(id);
    return this.prisma.torneo.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const t = await this.findOne(id);
    if (t._count?.partidos > 0 || t._count?.inscripciones > 0) {
      throw new BadRequestException('No se puede eliminar: el torneo tiene fases, partidos o inscripciones asociadas.');
    }
    await this.prisma.torneo.delete({ where: { id } });
    return { ok: true };
  }

  // ============================================================
  // FIXTURE / FASES / GRUPOS / PARTIDOS
  // ============================================================

  /**
   * Genera el fixture completo del torneo:
   *  - Crea la(s) fase(s) según el formato.
   *  - Crea los grupos si corresponde.
   *  - Genera los cruces como partidos en estado "borrador".
   *  - Si se pasó fechaInicio/horaDefault, las asigna.
   *
   * REEMPLAZA el fixture existente (limpia partidos, fases y grupos previos).
   */
  async generarFixture(torneoId: string, dto: GenerarFixtureDto, userId?: string) {
    const torneo = await this.findOne(torneoId);
    if (!esFormatoValido(torneo.formato)) {
      throw new BadRequestException(`Formato no soportado: ${torneo.formato}`);
    }
    const inscripciones = await this.prisma.inscripcion.findMany({
      where: { torneoId },
      include: { equipo: { include: { club: true } } },
      orderBy: { createdAt: 'asc' },
    });
    if (inscripciones.length < 2) {
      throw new BadRequestException('El torneo necesita al menos 2 equipos inscritos para generar fixture.');
    }
    const equipos: EquipoSlot[] = inscripciones.map((i) => ({
      id: i.equipo.id,
      nombre: i.equipo.nombre,
      clubId: i.equipo.clubId,
    }));

    let resultado: ResultadoFixture;
    try {
      resultado = generarFixture(torneo.formato as any, equipos, {
        cantidadGrupos: dto.cantidadGrupos,
        gruposIdaVuelta: dto.gruposIdaVuelta,
        siembraOrdenada: dto.siembraOrdenada,
        clasificadosPorGrupo: dto.clasificadosPorGrupo,
      });
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'No se pudo generar el fixture');
    }

    // Persistir en una transacción
    return this.prisma.$transaction(async (tx) => {
      // 1) Borrar fixture anterior
      await tx.partidoReprogramacion.deleteMany({ where: { partido: { torneoId } } });
      await tx.partido.deleteMany({ where: { torneoId } });
      await tx.grupoEquipo.deleteMany({ where: { grupo: { fase: { torneoId } } } });
      await tx.grupo.deleteMany({ where: { fase: { torneoId } } });
      await tx.faseTorneo.deleteMany({ where: { torneoId } });

      // 2) Crear las fases (cada "fase" en el resultado = 1 fila en fases_torneo)
      const fasesCreadas: Record<string, string> = {};
      let orden = 1;
      for (const nombreFase of resultado.fases) {
        const fase = await tx.faseTorneo.create({
          data: {
            torneoId,
            nombre: nombreFase,
            tipo: nombreFase.toLowerCase().includes('grupo') ? 'grupos' : 'eliminacion',
            orden: orden++,
            estado: 'pendiente',
          },
        });
        fasesCreadas[nombreFase] = fase.id;
      }

      // 3) Crear grupos (si el formato los usa)
      const gruposCreados: Record<string, string> = {}; // "A" -> grupoId
      if (resultado.grupos) {
        // Asignar a la primera fase (la "fase de grupos")
        const faseId = Object.values(fasesCreadas)[0];
        for (const [nombreGrupo, lista] of Object.entries(resultado.grupos)) {
          const grupo = await tx.grupo.create({
            data: { faseId, nombre: nombreGrupo },
          });
          gruposCreados[nombreGrupo] = grupo.id;
          for (const eq of lista) {
            if (eq.id.startsWith('__')) continue; // BYE
            await tx.grupoEquipo.create({
              data: { grupoId: grupo.id, equipoId: eq.id },
            });
          }
        }
      }

      // 4) Generar los partidos
      const partidosCreados: any[] = [];
      const fechaInicio = dto.fechaInicio ? new Date(dto.fechaInicio) : null;
      const diasEntre = dto.diasEntreJornadas ?? 7;
      let ultimaFecha: Date | null = null;
      // Indexar fases por orden (asumimos que las fases en resultado.fases están en orden)
      const faseOrden: string[] = resultado.fases;
      const faseIdPorIndice: Record<number, string> = {};
      Object.entries(fasesCreadas).forEach(([nombre, id], idx) => {
        faseIdPorIndice[idx] = id;
      });

      for (const ronda of resultado.rondas) {
        // Asignar fecha si hay fechaInicio
        let fechaRonda: Date | null = null;
        if (fechaInicio) {
          if (ronda.numero === 1) {
            fechaRonda = new Date(fechaInicio);
            ultimaFecha = fechaRonda;
          } else if (ultimaFecha) {
            // Para round-robin las jornadas son consecutivas: offset = (n-1) * diasEntre
            // Para eliminatorias: cada etapa es una fase nueva, pero como las numeramos
            // de forma contigua, el mismo offset funciona.
            const offsetDias = (ronda.numero - 1) * diasEntre;
            fechaRonda = new Date(fechaInicio.getTime() + offsetDias * 24 * 60 * 60 * 1000);
            ultimaFecha = fechaRonda;
          }
        }

        for (const cruce of ronda.cruces) {
          // Si es un cruce placeholder (ganador X), no lo persistimos
          if (cruce.local.id.startsWith('__ganador_') || cruce.visitante.id.startsWith('__ganador_')) {
            continue;
          }
          if (cruce.local.id === '__bye__' || cruce.visitante.id === '__bye__') {
            continue;
          }
          // Determinar fase
          const idxFase = faseOrden.indexOf(ronda.nombre);
          const faseId = idxFase >= 0 ? faseIdPorIndice[idxFase] : null;
          const grupoId = cruce.grupo ? gruposCreados[cruce.grupo] : null;
          const partido = await tx.partido.create({
            data: {
              torneoId,
              faseId,
              grupoId,
              jornada: cruce.jornada ?? ronda.numero,
              etapaEliminatoria: cruce.etapa ?? null,
              esIda: cruce.esIda ?? true,
              equipoLocalId: cruce.local.id,
              equipoVisitanteId: cruce.visitante.id,
              fechaProgramada: fechaRonda,
              horaProgramada: dto.horaDefault ?? null,
              estado: fechaRonda ? 'programado' : 'borrador',
              creadoPorId: userId,
            },
          });
          partidosCreados.push(partido);
        }
      }

      // 5) Generado el fixture, el torneo pasa a "en_curso"
      await tx.torneo.update({
        where: { id: torneoId },
        data: { estado: 'en_curso' },
      });

      return {
        formato: torneo.formato,
        fases: resultado.fases,
        grupos: resultado.grupos,
        warnings: resultado.warnings,
        totalPartidos: partidosCreados.length,
        fechaInicio: fechaInicio,
      };
    });
  }

  // ============================================================
  // PARTIDOS
  // ============================================================

  listarPartidos(torneoId: string) {
    return this.prisma.partido.findMany({
      where: { torneoId },
      include: {
        fase: true,
        grupo: true,
        reprogramaciones: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: [{ jornada: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOnePartido(id: string) {
    const p = await this.prisma.partido.findUnique({
      where: { id },
      include: {
        torneo: true,
        fase: true,
        grupo: true,
        reprogramaciones: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!p) throw new NotFoundException(`Partido ${id} no encontrado`);
    return p;
  }

  async updatePartido(id: string, dto: UpdatePartidoDto) {
    await this.findOnePartido(id);
    const data: any = { ...dto };
    if (dto.fechaProgramada) data.fechaProgramada = new Date(dto.fechaProgramada);
    return this.prisma.partido.update({ where: { id }, data });
  }

  async reprogramarPartido(id: string, dto: ReprogramarPartidoDto, userId?: string) {
    const actual = await this.findOnePartido(id);
    if (!actual.torneo.permiteReprogramacion) {
      throw new BadRequestException('Este torneo no permite reprogramaciones.');
    }
    return this.prisma.$transaction(async (tx) => {
      const reprogramacion = await tx.partidoReprogramacion.create({
        data: {
          partidoId: id,
          fechaAnterior: actual.fechaProgramada,
          horaAnterior: actual.horaProgramada,
          canchaAnterior: actual.cancha,
          fechaNueva: dto.fechaProgramada ? new Date(dto.fechaProgramada) : null,
          horaNueva: dto.horaProgramada ?? null,
          canchaNueva: dto.cancha ?? null,
          motivo: dto.motivo,
          reprogramadoPorId: userId,
        },
      });
      const data: any = { estado: 'reprogramado' };
      if (dto.fechaProgramada !== undefined) data.fechaProgramada = dto.fechaProgramada ? new Date(dto.fechaProgramada) : null;
      if (dto.horaProgramada !== undefined) data.horaProgramada = dto.horaProgramada;
      if (dto.cancha !== undefined) data.cancha = dto.cancha;
      const partido = await tx.partido.update({ where: { id }, data });
      return { partido, reprogramacion };
    });
  }

  async eliminarPartido(id: string) {
    await this.findOnePartido(id);
    await this.prisma.partido.delete({ where: { id } });
    return { ok: true };
  }

  // ============================================================
  // FASES / GRUPOS (lectura)
  // ============================================================

  listarFases(torneoId: string) {
    return this.prisma.faseTorneo.findMany({
      where: { torneoId },
      orderBy: { orden: 'asc' },
      include: { grupos: { include: { equipos: true } }, _count: { select: { partidos: true } } },
    });
  }

  listarGrupos(faseId: string) {
    return this.prisma.grupo.findMany({
      where: { faseId },
      include: { equipos: { include: { grupo: true } } },
      orderBy: { nombre: 'asc' },
    });
  }
}
